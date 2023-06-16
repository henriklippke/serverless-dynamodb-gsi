# serverless-dynamodb-gsi
With this plugin you can work around the fact that only one GSI can be added at a time via CloudFormation.

This plugin is for the Serverless framework and allows for the removal of AWS DynamoDB GSI indexes from a CloudFormation template before deployment. The GSI indexes are cached and added to the respective table via the AWS JS SDK after deployment.

## Installation
To install the plugin, run the following command:
```
npm i @henriklippke/serverless-dynamodb-gsi --save-dev
```

## Configuration
Add the plugin to the serverless.yml file of your project and configure it as follows:
```
plugins:
  - serverless-dynamodb-gsi
```

## Usage
The plugin is automatically activated and removes the GSI indexes defined in a CloudFormation template before the "package:createDeploymentArtifacts" hook. The GSI indexes are then added via the AWS JS SDK after the "deploy:deploy" hook.

Note: Make sure to define the GSI indexes in the CloudFormation template as desired so that they are properly added.

## Problem
In AWS CloudFormation, there is a limitation where only one GSI (Global Secondary Index) can be added at a time. This means that every time you want to add or modify a GSI, you have to go through the entire process of adding or modifying a GSI by removing it and then adding it back.

This can cause problems in deployment processes, especially when multiple GSI's need to be added. Every time a GSI is added or modified, the entire deployment process has to be restarted, which can lead to longer deployment times. There is also a risk of errors occurring during the deployment process that can cause the deployment to fail and need to be repeated.

To work around this limitation, you can use a plugin like the serverless-dynamodb-gsi suggested by me, which removes and caches the GSI indexes before deployment and then adds them via the AWS JS SDK after deployment. This allows you to add multiple GSI's in a single deployment without having to restart the entire deployment process.

## License
dynamodb-gsi-plugin is licensed under the MIT license. See the LICENSE file for more information.
