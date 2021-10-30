const AWS = require('aws-sdk');
AWS.config.update( {
  region: 'us-east-2'
});
const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = 'prueba01';
const header = '/health';
const alumnoPath = '/alumno';
const alumnosPath = '/alumnos';

exports.handler = async function(event) {
  console.log('Request event: ', event);
  let response;
  switch(true) {
    case event.httpMethod === 'GET' && event.path === header:
      response = buildResponse(200);
      break;
    case event.httpMethod === 'GET' && event.path === alumnoPath:
      response = await getAlumno(event.queryStringParameters.carnet);
      break;
    case event.httpMethod === 'GET' && event.path === alumnosPath:
      response = await getAlumnos();
      break;
    case event.httpMethod === 'POST' && event.path === alumnoPath:
      response = await saveAlumno(JSON.parse(event.body));
      break;
    case event.httpMethod === 'PATCH' && event.path === alumnoPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyAlumno(requestBody.carnet, requestBody.updateKey, requestBody.updateValue);
      break;
    case event.httpMethod === 'DELETE' && event.path === alumnoPath:
      response = await deleteAlumno(JSON.parse(event.body).carnet);
      break;
    default:
      response = buildResponse(404, '404 Not Found');
  }
  return response;
}

async function getAlumno(carnet) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'carnet': carnet
    }
  }
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  });
}

async function getAlumnos() {
  const params = {
    TableName: dynamodbTableName
  }
  const allAlumnos = await scanDynamoRecords(params, []);
  const body = {
    Alumnos: allAlumnos
  }
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  }
}

async function saveAlumno(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: 'SAVE',
      Message: 'SUCCESS',
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  })
}

async function modifyAlumno(carnet, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'carnet': carnet
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ':value': updateValue
    },
    ReturnValues: 'UPDATED_NEW'
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: 'UPDATE',
      Message: 'SUCCESS',
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  })
}

async function deleteAlumno(carnet) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      'carnet': carnet
    },
    ReturnValues: 'ALL_OLD'
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: 'DELETE',
      Message: 'SUCCESS',
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  })
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}