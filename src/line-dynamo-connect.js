const https = require('https');
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB({
    region: 'ap-northeast-1',
    apiVersion: '2012-08-10',
    accessKeyId: process.env.DYNAMO_API_ACCESS_KEY,
    secretAccessKey: process.env.DYNAMO_USER_SECRET_ACCESS_KEY
});

const tableName = 'messages';

function createResponseMessage(messageData) {
  const message = messageData.message;
  let resMessage;
  if (message.type === 'text') {
    // text
    resMessage = {
      type: message.type,
      text: message.text
    }
  } else if (message.type === 'sticker') {
    // stamp
    resMessage = {
      type: message.type,
      packageId: message.packageId,
      stickerId: message.stickerId
    };
  }

  return resMessage;
}

exports.handler = (event, context, callback) => {
    const messageData = event.events && event.events[0];
    const replyToken = messageData.replyToken;
    const message = messageData.message;
    const text = message.text;
    const source = messageData.source;

    const resMessage = createResponseMessage(messageData);
    const data = JSON.stringify({
       replyToken: replyToken,
       messages: [resMessage]
    });

    const Authorization = 'Bearer ' + process.env.ENTER_ACCESS_TOKEN;
    opts = {
        hostname: 'api.line.me',
        path: '/v2/bot/message/reply',
        headers: {
            "Content-type": "application/json; charset=UTF-8",
            "Authorization": Authorization
        },
        method: 'POST',
    };

    const req = https.request(opts, function(res) {
        res.on('data', function(res) {
            console.log(res.toString());
        }).on('error', function(e) {
            console.log('ERROR: ' + e.stack);
        });
    });
    req.write(data);
    req.end();

    // TODO Inserting null data
    const userId = source.userId;
    const params = {
        TableName: tableName,
        Item: {
            '_id': {
                S: userId + '_' + Date.now(),
            },
            userId: {
              S: userId
            },
            message: {
              M: {
                type: {
                  S: message.type
                }
              }
            }
        }
    };
    console.error
    dynamo.putItem(params, function(err, data) {
        if (err) {
            console.error("-----error", err);
            return;
        }
        console.log('dynamo putItem succeeded');
        console.error(data);
    });
};
