const DynamoDBGSIPlugin = require('../index');

describe('DynamoDBGSIPlugin', () => {
    let plugin;
    let serverless;
    let options;
    let provider;
    let dynamoDbMock;

    beforeEach(() => {
        serverless = {
            service: {
                resources: {
                    Resources: {
                        MyTable: {
                            Type: 'AWS::DynamoDB::Table',
                            Properties: {
                                TableName: 'my-table',
                                AttributeDefinitions: [
                                    {
                                        AttributeName: 'status',
                                        AttributeType: 'S'
                                    }
                                ],
                                GlobalSecondaryIndexes: [
                                    {
                                        IndexName: 'my-index',
                                        KeySchema: [
                                            {
                                                AttributeName: 'status',
                                                KeyType: 'HASH'
                                            }
                                        ],
                                        Projection: {
                                            ProjectionType: 'ALL'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            getProvider: jest.fn(),
        };
        options = {
            region: 'us-east-1',
        };
        provider = {};
        dynamoDbMock = {
            updateTable: jest.fn().mockReturnValue({ promise: jest.fn() }),
        };

        provider.request = jest.fn().mockResolvedValue({
            Table: {
                TableStatus: 'ACTIVE'
            }
        });

        serverless.getProvider.mockReturnValue(provider);

        plugin = new DynamoDBGSIPlugin(serverless, options);
        plugin.dynamoDb = dynamoDbMock;
    });

    describe('removeGSIsFromTemplate', () => {

        it('removes global secondary indexes from the resources', () => {
            plugin.removeGSIsFromTemplate();
            const { Resources } = serverless.service.resources;
            const myTable = Resources.MyTable;

            expect(myTable.Properties.GlobalSecondaryIndexes).toBeUndefined();
        });

        it('stores the removed global secondary indexes and attribute definitions', () => {
            plugin.removeGSIsFromTemplate();
            gsiIndexes = [
                {
                    'my-table':
                        [
                            {
                                IndexName: 'my-index',
                                KeySchema: [
                                    {
                                        AttributeName: 'status',
                                        KeyType: 'HASH'
                                    }
                                ],
                                Projection: {
                                    ProjectionType: 'ALL'
                                }
                            }
                        ]
                }
            ]
            expect(plugin.gsiIndexes).toEqual(gsiIndexes);
            expect(plugin.attributeDefinitions).toEqual([
                {
                    AttributeName: 'status',
                    AttributeType: 'S'
                }
            ]);
        });
    });

    describe('createGSIs', () => {
        it('creates global secondary indexes with the specified attribute definitions', async () => {
            plugin.gsiIndexes = [
                {
                    'my-table':
                        [
                            {
                                IndexName: 'my-index',
                                KeySchema: [
                                    {
                                        AttributeName: 'status',
                                        KeyType: 'HASH'
                                    }
                                ],
                                Projection: {
                                    ProjectionType: 'ALL'
                                }
                            }
                        ]
                }
            ]
            plugin.attributeDefinitions = [
                {
                    AttributeName: 'status',
                    AttributeType: 'S'
                }
            ]

            await plugin.createGSIs();

            expect(dynamoDbMock.updateTable).toHaveBeenCalledWith({
                TableName: 'my-table',
                GlobalSecondaryIndexUpdates: [
                    {
                        Create: {
                            IndexName: 'my-index',
                            KeySchema: [
                                {
                                    AttributeName: 'status',
                                    KeyType: 'HASH'
                                }
                            ],
                            Projection: {
                                ProjectionType: 'ALL'
                            }
                        },
                    },
                ],
                AttributeDefinitions: [
                    {
                        AttributeName: 'status',
                        AttributeType: 'S'
                    }
                ],
            });
        });
    });
});
