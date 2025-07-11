const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const FILES_TABLE = process.env.FILES_TABLE;
const UPLOADS_BUCKET = process.env.UPLOADS_BUCKET;

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    const { arguments: args, fieldName } = event;

    switch (fieldName) {
      case 'uploadFile':
        return await handleUploadFile(args.input);
      case 'deleteFile':
        return await handleDeleteFile(args.input);
      case 'getFile':
        return await handleGetFile(args.id);
      case 'listFiles':
        return await handleListFiles(args.userId, args.limit, args.nextToken);
      default:
        throw new Error(`Unsupported field: ${fieldName}`);
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

async function handleUploadFile(input) {
  const { name, size, type, userId } = input;
  
  // Validate input
  if (!name || !size || !type || !userId) {
    throw new Error('Missing required fields: name, size, type, userId');
  }

  // Validate file size (50MB limit)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (size > maxSize) {
    throw new Error('File size exceeds 50MB limit');
  }

  // Validate file type
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'
  ];

  if (!allowedTypes.includes(type)) {
    throw new Error('File type not allowed');
  }

  const fileId = uuidv4();
  const key = `${userId}/${fileId}/${name}`;
  const now = new Date().toISOString();

  // Create file record in DynamoDB
  const fileRecord = {
    id: fileId,
    name,
    size,
    type,
    url: `https://${UPLOADS_BUCKET}.s3.amazonaws.com/${key}`,
    userId,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
    progress: 0
  };

  await dynamodb.put({
    TableName: FILES_TABLE,
    Item: fileRecord
  }).promise();

  // Generate presigned URL for upload
  const presignedUrl = await s3.getSignedUrlPromise('putObject', {
    Bucket: UPLOADS_BUCKET,
    Key: key,
    ContentType: type,
    Expires: 3600, // 1 hour
    Conditions: [
      ['content-length-range', 0, maxSize],
      ['starts-with', '$Content-Type', type.split('/')[0]]
    ]
  });

  return {
    file: fileRecord,
    presignedUrl,
    expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
}

async function handleDeleteFile(input) {
  const { id, userId } = input;

  if (!id || !userId) {
    throw new Error('Missing required fields: id, userId');
  }

  // Get file record
  const result = await dynamodb.get({
    TableName: FILES_TABLE,
    Key: { id }
  }).promise();

  if (!result.Item) {
    throw new Error('File not found');
  }

  if (result.Item.userId !== userId) {
    throw new Error('Unauthorized: Cannot delete file owned by another user');
  }

  // Delete from S3
  const key = `${userId}/${id}/${result.Item.name}`;
  try {
    await s3.deleteObject({
      Bucket: UPLOADS_BUCKET,
      Key: key
    }).promise();
  } catch (error) {
    console.warn('S3 delete failed:', error);
    // Continue with DynamoDB deletion even if S3 fails
  }

  // Delete from DynamoDB
  await dynamodb.delete({
    TableName: FILES_TABLE,
    Key: { id }
  }).promise();

  return {
    success: true,
    message: 'File deleted successfully'
  };
}

async function handleGetFile(id) {
  if (!id) {
    throw new Error('File ID is required');
  }

  const result = await dynamodb.get({
    TableName: FILES_TABLE,
    Key: { id }
  }).promise();

  return result.Item || null;
}

async function handleListFiles(userId, limit = 20, nextToken = null) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const params = {
    TableName: FILES_TABLE,
    IndexName: 'UserIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    },
    ScanIndexForward: false, // Most recent first
    Limit: Math.min(limit, 100) // Max 100 items
  };

  if (nextToken) {
    params.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await dynamodb.query(params).promise();

  return {
    items: result.Items || [],
    nextToken: result.LastEvaluatedKey 
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null
  };
} 