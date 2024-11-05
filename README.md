# Amazon Location Utilities - Authentication Helper for JavaScript

[![Version](https://img.shields.io/npm/v/@aws/amazon-location-utilities-auth-helper?style=flat)](https://www.npmjs.com/package/@aws/amazon-location-utilities-auth-helper) [![Tests](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/actions/workflows/build.yml/badge.svg)](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/actions/workflows/build.yml)

These are utilities to help customers authenticate when making [Amazon Location Service](https://aws.amazon.com/location/) API calls from their JavaScript applications. This specifically helps when using [API keys](https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html) or [Amazon Cognito](https://docs.aws.amazon.com/location/latest/developerguide/authenticating-using-cognito.html) as the authentication method.

## Installation

Install this library from NPM for usage with modules:

```console
npm install @aws/amazon-location-utilities-auth-helper
```

Importing in an HTML file for usage directly in the browser.

```html
<script src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-utilities-auth-helper@1"></script>
```

## Usage

Import the library and call the utility functions in the top-level namespace as needed. This library is used to authenticate requests from the standalone [Maps](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-geomaps-client/), [Places](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-geoplaces-client/), and [Routes](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-georoutes-client/) SDKs, the [Location SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-location/), and when rendering maps with [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/).

You can find more details about these functions in the [Documentation](#documentation) section.

### Usage with modules

These examples showcase importing our libraries in modules, and then using a bundler to combine your module(s) into a script that can be run in the browser or other environments.

This example uses the standalone [Places](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-geoplaces-client/) SDK to make a request that authenticates using API keys.

```console
npm install @aws-sdk/geo-places-client
```

```javascript
// Import from the AWS JavaScript SDK V3 (GeoPlacesClient)
import { GeoPlacesClient, GeocodeCommand } from "@aws-sdk/geo-places-client";
// Import the utility functions
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

// Create an authentication helper instance using an API key and region
const authHelper = withAPIKey("<API Key>", "<Region>");

// Configures the client to use API keys when making supported requests
const client = new GeoPlacesClient(authHelper.getClientConfig());

const input = { ... };
const command = new GeocodeCommand(input);
const response = await client.send(command);
```

This example uses the standalone [Routes](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-georoutes-client/) SDK to make a request that authenticates using API keys.

```console
npm install @aws-sdk/geo-routes-client
```

```javascript
// Import from the AWS JavaScript SDK V3 (GeoRoutesClient)
import { GeoRoutesClient, CalculateRoutesCommand } from "@aws-sdk/geo-routes-client";
// Import the utility functions
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

// Create an authentication helper instance using an API key and region
const authHelper = withAPIKey("<API Key>", "<Region>");

// Configures the client to use API keys when making supported requests
const client = new GeoRoutesClient(authHelper.getClientConfig());

const input = { ... };
const command = new CalculateRoutesCommand(input);
const response = await client.send(command);
```

This example uses the [Location](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-location/) SDK to make a request that authenticates using API keys.

```console
npm install @aws-sdk/client-location
```

```javascript
// Import from the AWS JavaScript SDK V3 (LocationClient)
import { LocationClient, ListGeofencesCommand } from "@aws-sdk/client-location";
// Import the utility functions
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

// Create an authentication helper instance using an API key and region
const authHelper = withAPIKey("<API Key>", "<Region>");

// Configures the client to use API keys when making supported requests
const client = new LocationClient(authHelper.getClientConfig());

const input = { ... };
const command = new ListGeofencesCommand(input);
const response = await client.send(command);
```

This example uses the standalone [Routes](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-amzn-georoutes-client/) SDK to make a request that that authenticates using Amazon Cognito.

```console
npm install @aws-sdk/geo-routes-client
```

```javascript
// Import from the AWS JavaScript SDK V3 (GeoRoutesClient)
import { GeoRoutesClient, CalculateRoutesCommand } from "@aws-sdk/geo-routes-client";
// Import the utility functions
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";

// Create an authentication helper instance using credentials from Cognito
const authHelper = await withIdentityPoolId("<Identity Pool ID>");

// Configures the client to use credentials obtained via Amazon Cognito
const client = new GeoRoutesClient(authHelper.getClientConfig());

const input = { ... };
const command = new CalculateRoutesCommand(input);
const response = await client.send(command);
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to render a map that authenticates resource requests using an API key.

> The authentication helper is not needed when using MapLibre to render a map using API keys, because the style descriptor URL and API key can be passed into the style endpoint directly.

```javascript
// Import MapLibre GL JS
import maplibregl from "maplibre-gl";

const apiKey = "<API Key>";
const region = "<Region>"; // Region containing Amazon Location resource
const styleName = "Standard"; // Standard, Monochrome, Hybrid, or Satellite

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${styleName}/descriptor?key=${apiKey}`,
});
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to render a map that authenticates resource requests using Amazon Cognito.

```javascript
// Import MapLibre GL JS
import maplibregl from "maplibre-gl";
// Import the utility function
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";

const identityPoolId = "<Identity Pool ID>";
const region = "<Region>"; // Region containing Amazon Location resource
const styleName = "Standard"; // Standard, Monochrome, Hybrid, or Satellite

// Create an authentication helper instance using credentials from Cognito
const authHelper = await withIdentityPoolId(identityPoolId);

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${styleName}/descriptor`,
  ...authHelper.getMapAuthenticationOptions(),
});
```

### Usage with a browser

Utility functions are available under the `amazonLocationAuthHelper` global.

> Some of these example use the Amazon Location Client. The Amazon Location Client is based on the [AWS SDK for JavaScript V3](https://github.com/aws/aws-sdk-js-v3) and allows for making calls to Amazon Location through a script referenced in an HTML file.

This example uses the Amazon Location Client to make a request that that authenticates using API keys.

```html
<!-- Importing the Amazon Location Client (which includes the auth-helper) -->
<script src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-client@1"></script>
```

```javascript
// Create an authentication helper instance using an API key and region
const authHelper = amazonLocationClient.withAPIKey("<API Key>", "<Region>");

// Configures the client to use API keys when making supported requests
const client = new amazonLocationClient.GeoRoutesClient(authHelper.getClientConfig());
const input = { ... };
const command = new amazonLocationClient.routes.CalculateRoutesCommand(input);
const response = await client.send(command);
```

This example uses the Amazon Location Client to make a request that that authenticates using Amazon Cognito.

```html
<!-- Import the Amazon Location Client (which includes the auth-helper) -->
<script src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-client@1"></script>
```

```javascript
// Create an authentication helper instance using credentials from Cognito
const authHelper = await amazonLocationClient.withIdentityPoolId("<Identity Pool ID>");

// Configures the client to use credentials obtained via Amazon Cognito
const client = new amazonLocationClient.GeoRoutesClient(authHelper.getClientConfig());
const input = { ... };
const command = new amazonLocationClient.routes.CalculateRoutesCommand(input);
const response = await client.send(command);
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to render a map that authenticates resource requests using an API key.

> The authentication helper is not needed when using MapLibre to render a map using API keys, because the style descriptor URL and API key can be passed into the style endpoint directly.

```html
<!-- MapLibre GL JS -->
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4"></script>
```

```javascript
const apiKey = "<API Key>";
const region = "<Region>"; // Region containing Amazon Location resource
const styleName = "Standard"; // Standard, Monochrome, Hybrid, or Satellite

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${styleName}/descriptor?key=${apiKey}`,
});
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to render a map that authenticates resource requests using Amazon Cognito.

```html
<!-- MapLibre GL JS -->
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4"></script>
<!-- Importing the authentication SDK -->
<script src="https://cdn.jsdelivr.net/npm/@aws/amazon-location-utilities-auth-helper@1"></script>
```

```javascript
const identityPoolId = "<Identity Pool ID>";
const region = "<Region>"; // Region containing Amazon Location resource
const styleName = "Standard"; // Standard, Monochrome, Hybrid, or Satellite

// Create an authentication helper instance using credentials from Cognito
const authHelper = await amazonLocationAuthHelper.withIdentityPoolId(identityPoolId);

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/v2/styles/${styleName}/descriptor`,
  ...authHelper.getMapAuthenticationOptions(),
});
```

Alternatively, should you prefer to use authenticated identities you can modify the `withIdentityPoolId` signature to provide custom parameters:

```javascript
const userPoolId = "<User pool Id>";
...

// Create an authentication helper instance using credentials from Cognito
const authHelper = await amazonLocationAuthHelper.withIdentityPoolId(identityPoolId, {
  logins: {
    [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: "cognito-id-token"
  }
});

...
```

You can retrieve the `cognito-id-token` from the user session [using Amplify](https://docs.amplify.aws/javascript/build-a-backend/auth/manage-user-session/#retrieve-a-user-session)

## Documentation

Detailed documentation can be generated under `docs/index.html` by running:

```console
npm run typedoc
```

### `withAPIKey`

Creates an auth helper instance using API key (and region, optionally).

```javascript
const authHelper = withAPIKey(apiKey, region);
```

### `withIdentityPoolId`

Creates an auth helper instance using credentials from Cognito.

```javascript
const authHelper = await withIdentityPoolId(identityPoolId);
```

## Getting Help

The best way to interact with our team is through GitHub.
You can [open an issue](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new/choose) and choose from one of our templates for
[bug reports](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=bug%2C+needs-triage&template=---bug-report.md&title=),
[feature requests](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=feature-request&template=---feature-request.md&title=)
or [guidance](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=guidance%2C+needs-triage&template=---questions---help.md&title=).
If you have a support plan with [AWS Support](https://aws.amazon.com/premiumsupport/), you can also create a new support case.

Please make sure to check out the following resources before opening an issue:

- Our [Changelog](CHANGELOG.md) for recent changes.

## Contributing

We welcome community contributions and pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to set up a development environment and submit code.

## License

Amazon Location Utilities - Authentication Helper for JavaScript is distributed under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0),
see LICENSE.txt and NOTICE.txt for more information.
