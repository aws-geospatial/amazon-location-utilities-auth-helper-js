# Amazon Location Utilities - Authentication Helper for JavaScript

Utilities to help customers authenticate when making [Amazon Location Service](https://aws.amazon.com/location/) API calls from their JavaScript application. This specifically helps when using [Amazon Cognito](https://docs.aws.amazon.com/location/latest/developerguide/authenticating-using-cognito.html) or [API keys](https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html) as the authentication method.

# Installation

Install this library from NPM for usage with modules:

```
npm install @aws/amazon-location-utilities-auth-helper
```

Importing in an HTML file for usage directly in the browser.

```html
<script src="https://www.unpkg.com/@aws/amazon-location-utilities-auth-helper@%5E1.0.0/dist/amazonLocationAuthHelper.js"></script>
```

# Usage

Import the library and call the utility functions in the top-level namespace as needed. You can find more details about these functions in the [Documentation](#documentation) section.

### Usage with modules

This example uses the [AWS SDK for JavaScript V3](https://github.com/aws/aws-sdk-js-v3) to make a request that that authenticates using Amazon Cognito.

```javascript
// Importing AWS JavaScript SDK V3
import { LocationClient, CalculateRouteCommand } from "@aws-sdk/client-location";
// Importing the utility function
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";

const identityPoolId = "<Identity Pool ID>";

// Create an authentication helper instance using credentials from Cognito
const authHelper = await withIdentityPoolId(identityPoolId);

const client = new LocationClient({
  region: "<Region>", // region containing Amazon Location resource
  ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
});
const input = { ... };
const command = new CalculateRouteCommand(input);
const response = await client.send(command);
```

This example uses the [AWS SDK for JavaScript V3](https://github.com/aws/aws-sdk-js-v3) to make a request that that authenticates using API keys.

```javascript
// Importing AWS JavaScript SDK V3
import { LocationClient, CalculateRouteCommand } from "@aws-sdk/client-location";
// Importing the utility function
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

const apiKey = "<API Key>";

// Create an authentication helper instance using an API key
const authHelper = await withAPIKey(apiKey);

const client = new LocationClient({
  region: "<Region>", // region containing Amazon Location resource
  ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
});
const input = { ... };
const command = new CalculateRouteCommand(input);
const response = await client.send(command);
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to make a request to render a map that authenticates using Amazon Cognito.

> The authentication helper is not needed if when using MapLibre GL JS to render a map using API keys. It can be passed into the style endpoint following [this guide](https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html#using-apikeys-in-maps).

```javascript
// Importing MapLibre GL JS
import maplibregl from "maplibre-gl";
// Importing the utility function
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";

const identityPoolId = "<Identity Pool ID>";
const mapName = "<Map Name>";
const region = "<Region>"; // region containing Amazon Location resource

// Create an authentication helper instance using credentials from Cognito
const authHelper = await withIdentityPoolId(identityPoolId);

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor`,
  ...authHelper.getMapAuthenticationOptions(),
});
```

### Usage with the browser

Utility functions will be within `amazonLocationAuthHelper`.

> Some of these example use the Amazon Location Client. The Amazon Location Client is based on the [AWS SDK for JavaScript V3](https://github.com/aws/aws-sdk-js-v3), which allows the use of making calls to Amazon Location through the script added into the HTML file.

This example uses the Amazon Location Client to make a request that that authenticates using Amazon Cognito.

```html
<!-- Importing Amazon Location Client -->
<script src="https://www.unpkg.com/@aws/amazon-location-client@%5E1.0.0/dist/amazonLocationClient.js"></script>
<!-- Importing the utility library from an HTML file -->
<script src="https://www.unpkg.com/@aws/amazon-location-utilities-auth-helper@%5E1.0.0/dist/amazonLocationAuthHelper.js"></script>
```

```javascript
const identityPoolId = "<Identity Pool ID>";

// Create an authentication helper instance using credentials from Cognito
const authHelper = await amazonLocationAuthHelper.withIdentityPoolId(identityPoolId);

const client = new amazonLocationClient.LocationClient({
  region: "<Region>", // region containing Amazon Location resource
  ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
});
const input = { ... };
const command = new amazonLocationClient.CalculateRouteCommand(input);
const response = await client.send(command);
```

This example uses the Amazon Location Client to make a request that that authenticates using API keys.

```html
<!-- Importing Amazon Location Client -->
<script src="https://www.unpkg.com/@aws/amazon-location-client@%5E1.0.0/dist/amazonLocationClient.js"></script>
<!-- Importing the utility library from an HTML file -->
<script src="https://www.unpkg.com/@aws/amazon-location-utilities-auth-helper@%5E1.0.0/dist/amazonLocationAuthHelper.js"></script>
```

```javascript
const apiKey = "<API Key>";

// Create an authentication helper instance using an API key
const authHelper = await amazonLocationAuthHelper.withAPIKey(apiKey);

const client = new amazonLocationClient.LocationClient({
  region: "<Region>", // region containing Amazon Location resource
  ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
});
const input = { ... };
const command = new amazonLocationClient.CalculateRouteCommand(input);
const response = await client.send(command);
```

This example uses [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/) to make a request to render a map that authenticates using Amazon Cognito.

> The authentication helper is not needed if when using MapLibre GL JS to render a map using API keys. It can be passed into the style endpoint following [this guide](https://docs.aws.amazon.com/location/latest/developerguide/using-apikeys.html#using-apikeys-in-maps).

```html
<!-- MapLibre GL JS -->
<script src="https://www.unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.js"></script>
<!-- Importing the utility library from an HTML file -->
<script src="https://www.unpkg.com/@aws/amazon-location-utilities-auth-helper@%5E1.0.0/dist/amazonLocationAuthHelper.js"></script>
```

```javascript
const identityPoolId = "<Identity Pool ID>";
const mapName = "<Map Name>";
const region = "<Region>"; // region containing Amazon Location resource

// Create an authentication helper instance using credentials from Cognito
const authHelper = await amazonLocationAuthHelper.withIdentityPoolId(identityPoolId);

// Render the map
const map = new maplibregl.Map({
  container: "map",
  center: [-123.115898, 49.295868],
  zoom: 10,
  style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor`,
  ...authHelper.getMapAuthenticationOptions(),
});
```

# Documentation

Detailed documentation can be found under `/docs/index.html` after generating it by running:

```
npm run typedoc
```

## withIdentityPoolId

Creates an auth helper instance using credentials from Cognito.

```javascript
const authHelper = await withIdentityPoolId(identityPoolId);
```

## withAPIKey

Creates an auth helper instance using API key.

```javascript
const authHelper = await withAPIKey(apiKey);
```

# Getting Help

The best way to interact with our team is through GitHub.
You can [open an issue](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new/choose) and choose from one of our templates for
[bug reports](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=bug%2C+needs-triage&template=---bug-report.md&title=),
[feature requests](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=feature-request&template=---feature-request.md&title=)
or [guidance](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/issues/new?assignees=&labels=guidance%2C+needs-triage&template=---questions---help.md&title=).
If you have a support plan with [AWS Support](https://aws.amazon.com/premiumsupport/), you can also create a new support case.

Please make sure to check out our resources too before opening an issue:

- Our [Changelog](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/blob/master/CHANGELOG.md) for recent changes.

# Contributing

We welcome community contributions and pull requests. See [CONTRIBUTING.md](https://github.com/aws-geospatial/amazon-location-utilities-auth-helper-js/blob/master/CONTRIBUTING.md) for information on how to set up a development environment and submit code.

# License

Amazon Location Utilities - Authentication Helper for JavaScript is distributed under the
[Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0),
see LICENSE.txt and NOTICE.txt for more information.
