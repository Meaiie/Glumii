// netlify/functions/apps-script-proxy.js
const fetch = require('node-fetch'); // จำเป็นต้องติดตั้ง node-fetch: npm install node-fetch@2

exports.handler = async function(event, context) {
  // นี่คือ URL ของ Google Apps Script Web App ของคุณ
  const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxq4QvLdwbvAACtljRCdJylq8Rmm1QpYaBayhcBABccy5DD7dLwiPw_lJxh7Tp1qR4Q/exec';
                               
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
    const requestBody = JSON.parse(event.body);
    const requestMethod = event.httpMethod;

    console.log(`Forwarding ${requestMethod} request to Google Apps Script.`);
    console.log('Request Body:', requestBody);

    // ส่งต่อ request ไปยัง Google Apps Script
    const response = await fetch(googleAppsScriptUrl, {
      method: requestMethod,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
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