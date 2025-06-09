// netlify/functions/apps-script-proxy.js
const fetch = require('node-fetch'); // จำเป็นต้องติดตั้ง node-fetch: npm install node-fetch@2

exports.handler = async function(event, context) {
  // นี่คือ URL ของ Google Apps Script Web App ของคุณ 
  // *** สำคัญ: ต้องใส่ URL ของ Apps Script Web App ที่ Deploy แล้ว ตรงนี้ ***
  // โปรดตรวจสอบและแทนที่ด้วย URL ที่ถูกต้องจาก Google Apps Script Deployments ของคุณ
  const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxq4QvLdwbvAACtljRCdJylq8Rmm1QpYaBayhcBABccy5DD7dLwiPw_lJxh7Tp1qR4Q/exec'; // <--- เปลี่ยนตรงนี้เป็น URL จริงของคุณ

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
    // ดึงข้อมูลและ method จาก request ที่มาจากหน้าบ้านของคุณ
    // สำหรับ POST requests, event.body จะเป็น string ที่ต้อง parse เป็น JSON
    let requestBody;
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.error("Failed to parse request body:", e);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid JSON body" })
        };
      }
    }

    const requestMethod = event.httpMethod;
    console.log('Proxy received request:', { method: requestMethod, body: requestBody, queryStringParameters: event.queryStringParameters });

    // สร้าง URL สำหรับ Apps Script โดยรวม queryStringParameters
    let finalAppsScriptUrl = googleAppsScriptUrl;
    if (event.queryStringParameters) {
        const queryParams = new URLSearchParams(event.queryStringParameters).toString();
        if (queryParams) {
            finalAppsScriptUrl += '?' + queryParams;
        }
    }

    console.log('Forwarding request to Apps Script URL:', finalAppsScriptUrl);

    // ส่ง request ไปยัง Google Apps Script Web App
    const response = await fetch(finalAppsScriptUrl, {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      // ใส่ body เฉพาะถ้าเป็น POST หรือ PUT
      body: requestMethod === 'POST' || requestMethod === 'PUT' ? JSON.stringify(requestBody) : undefined
    });

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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // บอกเบราว์เซอร์ว่า Methods ที่อนุญาต
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
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
    };
  }
};