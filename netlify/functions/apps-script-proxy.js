// netlify/functions/apps-script-proxy.js
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
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
            body: JSON.stringify({ 
                status: 'error', 
                message: 'Server configuration error: Google Apps Script URL is missing.' 
            }),
        };
    }

    // Preflight
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
        const method = event.httpMethod;
        let targetUrl = googleAppsScriptUrl;
        let fetchOptions = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (method === 'POST') {
            if (!event.body) throw new Error('POST request body is empty.');
            fetchOptions.body = event.body;
        } else if (method === 'GET') {
            if (event.queryStringParameters) {
                const q = new URLSearchParams(event.queryStringParameters).toString();
                targetUrl = `${googleAppsScriptUrl}?${q}`;
            }
        }

        console.log(`Forwarding ${method} to GAS:`, targetUrl);

        const response = await fetch(targetUrl, fetchOptions);
        const dataText = await response.text();

        let data;
        try {
            data = JSON.parse(dataText);
        } catch (e) {
            throw new Error(`Response is not JSON: ${dataText}`);
        }

        if (!response.ok) {
            console.error('Apps Script Error:', data);
            return {
                statusCode: response.status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    status: 'error',
                    message: data.message || 'Apps Script error',
                    details: data
                })
            };
        }

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data)
        };

    } catch (error) {
        console.error('Error in Netlify Function:', error.message);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                status: 'error',
                message: error.message
            })
        };
    }
};
