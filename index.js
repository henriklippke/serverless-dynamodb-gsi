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
        this.attributeDefinitions = [];
    }

    removeGSIsFromTemplate() {
        const { resources: { Resources } } = this.serverless.service;
    
        if (Resources) {
            for (const resource of Object.values(Resources)) {
                if (resource.Type === 'AWS::DynamoDB::Table') {
                    console.log(`Removing GSIs from table '${resource.Properties.TableName}'...`);
                    const { TableName, GlobalSecondaryIndexes, AttributeDefinitions } = resource.Properties;
                    this.gsiIndexes.push({ [TableName]: GlobalSecondaryIndexes });
                    delete resource.Properties.GlobalSecondaryIndexes;

                    console.log(`Removing attribute definitions from table '${resource.Properties.TableName}'...`);
                    for (const gsi of GlobalSecondaryIndexes || []) {
                        for (const { AttributeName } of gsi.KeySchema) {
                            const index = AttributeDefinitions.findIndex(({ AttributeName: name }) => name === AttributeName);
                            if (index !== -1) {
                                this.attributeDefinitions.push(AttributeDefinitions.splice(index, 1)[0]);
                            }
                        }
                    }
                }
            }
        }
    }
    
    async createGSIs() {
        const region = this.options.region;
        const dynamoDb = new AWS.DynamoDB({ region });
    
        for (const [index, obj] of Object.entries(this.gsiIndexes)) {
            const tableName = Object.keys(obj)[0];
            const gsis = Object.values(obj)[0];
            for (const gsi of gsis || []) {
                if (gsi.KeySchema.length === 0) {
                    console.warn(`Skipping GSI creation for table '${tableName}' due to empty KeySchema.`);
                    continue;
                }

                let description = await dynamoDb.describeTable({ TableName: tableName }).promise();
                if (description.Table.GlobalSecondaryIndexes) {
                    let gsi_description = description.Table.GlobalSecondaryIndexes.find(({ IndexName }) => IndexName === gsi.IndexName);
                    if (gsi_description !== undefined) {
                        console.log(`GSI '${gsi.IndexName}' for table '${tableName}' already exists, skipping...`);
                        continue;
                    }
                }

                console.log(`Creating GSI '${gsi.IndexName}' for table '${tableName}'...`);
                const params = {
                    TableName: tableName,
                    GlobalSecondaryIndexUpdates: [
                        {
                            Create: {
                                IndexName: gsi.IndexName,
                                KeySchema: gsi.KeySchema,
                                Projection: gsi.Projection,
                            },
                        },
                    ],
                    AttributeDefinitions: this.attributeDefinitions,
                };

                await dynamoDb.updateTable(params).promise();
                if (gsis.indexOf(gsi) == gsis.length - 1) {
                    console.log('Last GSI created, skipping wait...');
                    break;
                }

                console.log(`Waiting for GSI '${gsi.IndexName}' to be created...`);
                let gsi_description = {IndexStatus: 'CREATING'};
                while (gsi_description === undefined || gsi_description.IndexStatus !== 'ACTIVE') {
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    description = await dynamoDb.describeTable({ TableName: tableName }).promise();
                    gsi_description = description.Table.GlobalSecondaryIndexes.find(({ IndexName }) => IndexName === gsi.IndexName);
                }
            }
        }
    }
}
module.exports = DynamoDBGSIPlugin;