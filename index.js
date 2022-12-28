'use strict';

const AWS = require('aws-sdk');

class DynamoDBGSIPlugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.hooks = {
      'before:package:createDeploymentArtifacts': this.removeGSIsFromTemplate.bind(this),
      'after:deploy:deploy': this.createGSIs.bind(this),
    };

    this.gsiIndexes = [];
  }

  removeGSIsFromTemplate() {
    const service = this.serverless.service;

    if (service.resources && service.resources.Resources) {
      Object.keys(service.resources.Resources).forEach((resourceName) => {
        const resource = service.resources.Resources[resourceName];

        if (resource.Type === 'AWS::DynamoDB::Table') {
          if (resource.Properties.GlobalSecondaryIndexes) {
            console.log('resource.Properties store the table names', resource.Properties);
            this.gsiIndexes = resource.Properties.GlobalSecondaryIndexes;
            delete resource.Properties.GlobalSecondaryIndexes;
          }
        }
      });
    }
  }

  createGSIs() {
    const stackName = this.provider.naming.getStackName(this.options.stage);
    const region = this.options.region;
    const dynamoDb = new AWS.DynamoDB({ region });

    console.log('we have to iterate of alle tables');
    return Promise.all(this.gsiIndexes.map((gsi) => {
      const params = {
        TableName: '<table-name>',
        GlobalSecondaryIndexUpdates: [
          {
            Create: gsi,
          },
        ],
      };

      return dynamoDb.updateTable(params).promise();
    }));
  }
}

module.exports = DynamoDBGSIPlugin;
