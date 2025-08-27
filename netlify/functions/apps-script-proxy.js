// netlify/functions/apps-script-proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // ดึง URL ของ Google Apps Script Web App จาก Environment Variables
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
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
            if (event.queryStringParameters) {
                const queryString = new URLSearchParams(event.queryStringParameters).toString();
                targetUrl = `${googleAppsScriptUrl}?${queryString}`;
            }
        }

        console.log(`Forwarding ${requestMethod} request to Google Apps Script.`);
        console.log('Target URL:', targetUrl);
        if (requestMethod === 'POST') {
            console.log('Request Body:', requestBody);
        }

        const response = await fetch(targetUrl, fetchOptions);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error from Apps Script: ${response.status} - ${errorText}`);
            throw new Error(`Google Apps Script responded with status ${response.status}: ${errorText}`);
        }

        const data = await response.json();

        console.log('Successfully received data from Google Apps Script:', data);

        // *** นี่คือส่วนที่แก้ไข ***
        // ส่ง response จาก Apps Script กลับไปให้หน้าบ้านโดยตรง
        return {
            statusCode: response.status,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST',
            },
            body: JSON.stringify(data) // ส่ง Object ที่ได้รับจาก Apps Script กลับไปเลย
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