// netlify/functions/apps-script-proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // ดึง URL ของ Google Apps Script Web App จาก Environment Variables
    // ตรวจสอบให้แน่ใจว่าคุณได้ตั้งค่า `GOOGLE_APPS_SCRIPT_URL` ใน Netlify Environment Variables แล้ว
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!googleAppsScriptUrl) {
        console.error('Error: GOOGLE_APPS_SCRIPT_URL environment variable is not set.');
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            },
            body: JSON.stringify({ status: 'error', message: 'Server configuration error: Google Apps Script URL is missing.' }),
        };
    }
                                
    // จัดการ Preflight request (OPTIONS)
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*', // อนุญาตทุก Origin ที่เรียกมายัง Netlify Function นี้
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // บอกเบราว์เซอร์ว่า Methods ที่อนุญาต
            },
            body: ''
        };
    }

    try {
        const requestMethod = event.httpMethod;
        let requestBody = {};
        let fetchOptions = {
            method: requestMethod,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        let targetUrl = googleAppsScriptUrl;

        if (requestMethod === 'POST') {
            if (!event.body) {
                throw new Error('POST request body is empty.');
            }
            requestBody = JSON.parse(event.body);
            fetchOptions.body = JSON.stringify(requestBody);
        } else if (requestMethod === 'GET') {
            // สำหรับ GET request, parameters ควรจะอยู่ใน query string
            // event.queryStringParameters จะมี parameters เช่น { action: 'checkUser', userId: 'U123' }
            // เราจะส่งต่อ query string ไปยัง Apps Script ตรงๆ
            if (event.queryStringParameters) {
                const queryString = new URLSearchParams(event.queryStringParameters).toString();
                targetUrl = `${googleAppsScriptUrl}?${queryString}`;
            }
        }
        // ถ้ามี method อื่นๆ เช่น PUT, DELETE ที่คุณอาจเพิ่มในอนาคต ก็จะจัดการ body แบบ POST
        // หรือจะระบุให้ชัดเจนว่าเฉพาะ POST เท่านั้นที่มี body ก็ได้

        console.log(`Forwarding ${requestMethod} request to Google Apps Script.`);
        console.log('Target URL:', targetUrl);
        if (requestMethod === 'POST') {
            console.log('Request Body:', requestBody);
        }

        // ส่งต่อ request ไปยัง Google Apps Script
        const response = await fetch(targetUrl, fetchOptions);

        // ตรวจสอบสถานะการตอบกลับจาก Apps Script
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from Apps Script: ${response.status} - ${errorText}`);
            throw new Error(`Google Apps Script responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json(); // อ่าน response เป็น JSON

        console.log('Successfully received data from Google Apps Script:', data);

        // ส่ง response กลับไปยังหน้าบ้านของคุณ
        return {
            statusCode: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*', // อนุญาตทุก Origin ที่เรียกมายัง Netlify Function นี้
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST', // บอกเบราว์เซอร์ว่า Methods ที่อนุญาต
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Error in Netlify Function:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST',
            },
            body: JSON.stringify({ status: 'error', message: `Internal server error: ${error.message}` })
        };
    }
};