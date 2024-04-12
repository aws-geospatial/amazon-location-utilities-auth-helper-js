/*
 * This is a copied and modified file from https://github.com/aws-amplify/amplify-js/blob/b96a0eddb53e6cb14eac22a2f5d7e0d1039b22d6/packages/core/src/Signer/Signer.ts
 * which was last modified on 02/13/2024
 * as well as several classes from https://github.com/aws-amplify/amplify-js/blob/main/packages/core/src/clients/middleware/signing/signer/signatureV4
 *
 * The Signer class has been deprecated and is no longer exported in aws-amplify/core. The aws-amplify/core package
 * intends to use the middleware/signing client going forward, but it also won't be exported so we can't use it
 * from our module.
 *
 * It has been modified to consolidate the necessary logic into a single file, and remove any un-needed logic for signing urls.
 * Modifications:
 * - Modified input parameters for signUrl to remove the other variants not needed for our use-case, only pass in a url not request, and include the region
 * - Hardcoded `geo` as the value of `service` to simplify logic
 * - Removed logic paths where a request was passed in instead of just a url
 */

// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Sha256 } from "@aws-crypto/sha256-js";
import { SourceData } from "@aws-sdk/types";
import { toHex } from "@smithy/util-hex-encoding";

// Query params
const ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
const AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
const CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
const SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
const SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
const TOKEN_QUERY_PARAM = "X-Amz-Security-Token";

// Headers
const HOST_HEADER = "host";

// Identifiers
const KEY_TYPE_IDENTIFIER = "aws4_request";
const SHA256_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
const SIGNATURE_IDENTIFIER = "AWS4";

// Preset values
const EMPTY_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

interface Credentials {
  /** AWS access key ID */
  readonly accessKeyId: string;
  /** AWS secret access key */
  readonly secretAccessKey: string;
  /** A security or session token to use with these credentials. Usually present for temporary credentials. */
  readonly sessionToken?: string;
  /** AWS credential scope for this set of credentials. */
  readonly credentialScope?: string;
}

interface SignRequestOptions {
  credentials: Credentials;
  signingDate?: Date;
  signingRegion: string;
  signingService: string;
  uriEscapePath?: boolean;
}

interface FormattedDates {
  longDate: string;
  shortDate: string;
}

interface HttpRequest {
  url: URL;
  method: string;
  headers: Headers;
  body?: unknown;
}

interface SigningValues
  extends Credentials,
    FormattedDates,
    Pick<SignRequestOptions, "signingRegion" | "signingService" | "uriEscapePath"> {
  credentialScope: string;
}

interface Presignable extends Pick<HttpRequest, "body" | "url"> {
  method?: HttpRequest["method"];
}

export class Signer {
  static signUrl(urlToSign: string, region: string, accessInfo: any): string {
    const method = "GET";
    let body: undefined;

    const presignable = {
      body,
      method,
      url: new URL(urlToSign),
    };

    const options = getOptions(urlToSign, region, accessInfo);
    const signedUrl = presignUrl(presignable, options);

    return signedUrl.toString();
  }
}

const getOptions = (
  url: string,
  region: string,
  accessInfo: { access_key: string; secret_key: string; session_token: string },
) => {
  const { access_key, secret_key, session_token } = accessInfo ?? {};
  const credentials = {
    accessKeyId: access_key,
    secretAccessKey: secret_key,
    sessionToken: session_token,
  };

  // Service hard-coded to "geo" for our purposes
  const service = "geo";

  return {
    credentials,
    signingDate: new Date(),
    signingRegion: region,
    signingService: service,
  };
};

/**
 * Given a `Presignable` object, returns a Signature Version 4 presigned `URL` object.
 *
 * @param presignable `Presignable` object containing at least a url to be presigned with authentication query params.
 * @param presignUrlOptions `PresignUrlOptions` object containing values used to construct the signature.
 * @returns A `URL` with authentication query params which can grant temporary access to AWS resources.
 */
const presignUrl = ({ body, method = "GET", url }: Presignable, { ...options }: SignRequestOptions): URL => {
  const signingValues = getSigningValues(options);
  const { accessKeyId, credentialScope, longDate, sessionToken } = signingValues;

  // create the request to sign
  const presignedUrl = new URL(url);
  Object.entries({
    [ALGORITHM_QUERY_PARAM]: SHA256_ALGORITHM_IDENTIFIER,
    [CREDENTIAL_QUERY_PARAM]: `${accessKeyId}/${credentialScope}`,
    [AMZ_DATE_QUERY_PARAM]: longDate,
    [SIGNED_HEADERS_QUERY_PARAM]: HOST_HEADER,
    ...(sessionToken && { [TOKEN_QUERY_PARAM]: sessionToken }),
  }).forEach(([key, value]) => {
    presignedUrl.searchParams.append(key, value);
  });
  const requestToSign = {
    body,
    headers: { [HOST_HEADER]: url.host },
    method,
    url: presignedUrl,
  };

  // calculate and add the signature to the url
  const signature = getSignature(requestToSign, signingValues);
  presignedUrl.searchParams.append(SIGNATURE_QUERY_PARAM, signature);

  return presignedUrl;
};

/**
 * Extracts common values used for signing both requests and urls.
 *
 * @param options `SignRequestOptions` object containing values used to construct the signature.
 * @returns Common `SigningValues` used for signing.
 * @internal
 */
const getSigningValues = ({
  credentials,
  signingDate = new Date(),
  signingRegion,
  signingService,
  uriEscapePath = true,
}: SignRequestOptions): SigningValues => {
  // get properties from credentials
  const { accessKeyId, secretAccessKey, sessionToken } = credentials;
  // get formatted dates for signing
  const { longDate, shortDate } = getFormattedDates(signingDate);
  // copy header and set signing properties
  const credentialScope = getCredentialScope(shortDate, signingRegion, signingService);

  return {
    accessKeyId,
    credentialScope,
    longDate,
    secretAccessKey,
    sessionToken,
    shortDate,
    signingRegion,
    signingService,
    uriEscapePath,
  };
};

/**
 * Returns expected date strings to be used in signing.
 *
 * @param date JavaScript `Date` object.
 * @returns `FormattedDates` object containing the following:
 *
 *   - LongDate: A date string in 'YYYYMMDDThhmmssZ' format
 *   - ShortDate: A date string in 'YYYYMMDD' format
 *
 * @internal
 */
const getFormattedDates = (date: Date): FormattedDates => {
  const longDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");

  return {
    longDate,
    shortDate: longDate.slice(0, 8),
  };
};

/**
 * Returns the credential scope which restricts the resulting signature to the specified region and service.
 *
 * @param date Current date in the format 'YYYYMMDD'.
 * @param region AWS region in which the service resides.
 * @param service Service to which the signed request is being sent.
 * @returns A string representing the credential scope with format 'YYYYMMDD/region/service/aws4_request'.
 * @internal
 */
const getCredentialScope = (date: string, region: string, service: string): string =>
  `${date}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`;

/**
 * Calculates and returns an AWS API Signature.
 * https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html
 *
 * @param request `HttpRequest` to be signed.
 * @param signRequestOptions `SignRequestOptions` object containing values used to construct the signature.
 * @returns AWS API Signature to sign a request or url with.
 * @internal
 */
const getSignature = (
  request /*: HttpRequest*/,
  {
    credentialScope,
    longDate,
    secretAccessKey,
    shortDate,
    signingRegion,
    signingService,
    uriEscapePath,
  }: SigningValues,
): string => {
  // step 1: create a canonical request
  const canonicalRequest = getCanonicalRequest(request, uriEscapePath);

  // step 2: create a hash of the canonical request
  const hashedRequest = getHashedDataAsHex(null, canonicalRequest);

  // step 3: create a string to sign
  const stringToSign = getStringToSign(longDate, credentialScope, hashedRequest);

  // step 4: calculate the signature
  const signature = getHashedDataAsHex(
    getSigningKey(secretAccessKey, shortDate, signingRegion, signingService),
    stringToSign,
  );

  return signature;
};

/**
 * Returns a canonical request.
 *
 * @param request `HttpRequest` from which to create the canonical request from.
 * @param uriEscapePath Whether to uri encode the path as part of canonical uri. It's used for S3 only where the
 *   pathname is already uri encoded, and the signing process is not expected to uri encode it again. Defaults to true.
 * @returns String created by by concatenating the following strings, separated by newline characters:
 *
 *   - HTTPMethod
 *   - CanonicalUri
 *   - CanonicalQueryString
 *   - CanonicalHeaders
 *   - SignedHeaders
 *   - HashedPayload
 *
 * @internal
 */
const getCanonicalRequest = ({ body, headers, method, url }: HttpRequest, uriEscapePath = true): string =>
  [
    method,
    getCanonicalUri(url.pathname, uriEscapePath),
    getCanonicalQueryString(url.searchParams),
    getCanonicalHeaders(headers),
    getSignedHeaders(headers),
    getHashedPayload(body),
  ].join("\n");

/**
 * Returns a canonical uri.
 *
 * @param pathname `pathname` from request url.
 * @param uriEscapePath Whether to uri encode the path as part of canonical uri. It's used for S3 only where the
 *   pathname is already uri encoded, and the signing process is not expected to uri encode it again. Defaults to true.
 * @returns URI-encoded version of the absolute path component URL (everything between the host and the question mark
 *   character (?) that starts the query string parameters). If the absolute path is empty, a forward slash character
 *   (/).
 * @internal
 */
const getCanonicalUri = (pathname: string, uriEscapePath = true): string =>
  pathname ? (uriEscapePath ? encodeURIComponent(pathname).replace(/%2F/g, "/") : pathname) : "/";

/**
 * Returns a canonical query string.
 *
 * @param searchParams `searchParams` from the request url.
 * @returns URL-encoded query string parameters, separated by ampersands (&). Percent-encode reserved characters,
 *   including the space character. Encode names and values separately. If there are empty parameters, append the equals
 *   sign to the parameter name before encoding. After encoding, sort the parameters alphabetically by key name. If
 *   there is no query string, use an empty string ("").
 * @internal
 */
const getCanonicalQueryString = (searchParams: URLSearchParams): string =>
  Array.from(searchParams)
    .sort(([keyA, valA], [keyB, valB]) => {
      if (keyA === keyB) {
        return valA < valB ? -1 : 1;
      }

      return keyA < keyB ? -1 : 1;
    })
    .map(([key, val]) => `${escapeUri(key)}=${escapeUri(val)}`)
    .join("&");

const escapeUri = (uri: string): string => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);

const hexEncode = (c: string) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`;

/**
 * Returns canonical headers.
 *
 * @param headers Headers from the request.
 * @returns Request headers that will be signed, and their values, separated by newline characters. Header names must
 *   use lowercase characters, must appear in alphabetical order, and must be followed by a colon (:). For the values,
 *   trim any leading or trailing spaces, convert sequential spaces to a single space, and separate the values for a
 *   multi-value header using commas.
 * @internal
 */
const getCanonicalHeaders = (headers: HttpRequest["headers"]): string =>
  Object.entries(headers)
    .map(([key, value]) => ({
      key: key.toLowerCase(),
      value: value?.trim().replace(/\s+/g, " ") ?? "",
    }))
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((entry) => `${entry.key}:${entry.value}\n`)
    .join("");

/**
 * Returns signed headers.
 *
 * @param headers `headers` from the request.
 * @returns List of headers included in canonical headers, separated by semicolons (;). This indicates which headers are
 *   part of the signing process. Header names must use lowercase characters and must appear in alphabetical order.
 * @internal
 */
const getSignedHeaders = (headers: HttpRequest["headers"]): string =>
  Object.keys(headers)
    .map((key) => key.toLowerCase())
    .sort()
    .join(";");

const getHashedPayload = (body: HttpRequest["body"]): string => {
  // Modification - For our use-case, the body is always null,
  // so we just return the EMPTY_HASH
  // return precalculated empty hash if body is undefined or null
  return EMPTY_HASH;
};

/**
 * Returns the hashed data a `Uint8Array`.
 *
 * @param key `SourceData` to be used as hashing key.
 * @param data Hashable `SourceData`.
 * @returns `Uint8Array` created from the data as input to a hash function.
 */
const getHashedData = (key: SourceData | null, data: SourceData): Uint8Array => {
  const sha256 = new Sha256(key ?? undefined);
  sha256.update(data);

  const hashedData = sha256.digestSync();

  return hashedData;
};

/**
 * Returns the hashed data as a hex string.
 *
 * @param key `SourceData` to be used as hashing key.
 * @param data Hashable `SourceData`.
 * @returns String using lowercase hexadecimal characters created from the data as input to a hash function.
 * @internal
 */
const getHashedDataAsHex = (key: SourceData | null, data: SourceData): string => {
  const hashedData = getHashedData(key, data);

  return toHex(hashedData);
};

/**
 * Returns a string to be signed.
 *
 * @param date Current date in the format 'YYYYMMDDThhmmssZ'.
 * @param credentialScope String representing the credential scope with format 'YYYYMMDD/region/service/aws4_request'.
 * @param hashedRequest Hashed canonical request.
 * @returns A string created by by concatenating the following strings, separated by newline characters:
 *
 *   - Algorithm
 *   - RequestDateTime
 *   - CredentialScope
 *   - HashedCanonicalRequest
 *
 * @internal
 */
const getStringToSign = (date: string, credentialScope: string, hashedRequest: string): string =>
  [SHA256_ALGORITHM_IDENTIFIER, date, credentialScope, hashedRequest].join("\n");

/**
 * Returns a signing key to be used for signing requests.
 *
 * @param secretAccessKey AWS secret access key from credentials.
 * @param date Current date in the format 'YYYYMMDD'.
 * @param region AWS region in which the service resides.
 * @param service Service to which the signed request is being sent.
 * @returns `Uint8Array` calculated from its composite parts.
 * @internal
 */
const getSigningKey = (secretAccessKey: string, date: string, region: string, service: string): Uint8Array => {
  const key = `${SIGNATURE_IDENTIFIER}${secretAccessKey}`;
  const dateKey = getHashedData(key, date);
  const regionKey = getHashedData(dateKey, region);
  const serviceKey = getHashedData(regionKey, service);
  const signingKey = getHashedData(serviceKey, KEY_TYPE_IDENTIFIER);

  return signingKey;
};
