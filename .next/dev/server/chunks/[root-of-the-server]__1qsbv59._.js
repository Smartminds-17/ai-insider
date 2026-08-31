module.exports = [
"[externals]/@prisma/client [external] (@prisma/client, cjs, [project]/node_modules/@prisma/client)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("@prisma/client-2c3a283f134fdcb6", () => require("@prisma/client-2c3a283f134fdcb6"));

module.exports = mod;
}),
"[project]/node_modules/@auth/prisma-adapter/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PrismaAdapter",
    ()=>PrismaAdapter
]);
function PrismaAdapter(prisma) {
    const p = prisma;
    return {
        // We need to let Prisma generate the ID because our default UUID is incompatible with MongoDB
        createUser: ({ id, ...data })=>p.user.create(stripUndefined(data)),
        getUser: (id)=>p.user.findUnique({
                where: {
                    id
                }
            }),
        getUserByEmail: (email)=>p.user.findUnique({
                where: {
                    email
                }
            }),
        async getUserByAccount (provider_providerAccountId) {
            const account = await p.account.findUnique({
                where: {
                    provider_providerAccountId
                },
                include: {
                    user: true
                }
            });
            return account?.user ?? null;
        },
        updateUser: ({ id, ...data })=>p.user.update({
                where: {
                    id
                },
                ...stripUndefined(data)
            }),
        deleteUser: (id)=>p.user.delete({
                where: {
                    id
                }
            }),
        linkAccount: (data)=>p.account.create({
                data
            }),
        unlinkAccount: (provider_providerAccountId)=>p.account.delete({
                where: {
                    provider_providerAccountId
                }
            }),
        async getSessionAndUser (sessionToken) {
            const userAndSession = await p.session.findUnique({
                where: {
                    sessionToken
                },
                include: {
                    user: true
                }
            });
            if (!userAndSession) return null;
            const { user, ...session } = userAndSession;
            return {
                user,
                session
            };
        },
        createSession: (data)=>p.session.create(stripUndefined(data)),
        updateSession: (data)=>p.session.update({
                where: {
                    sessionToken: data.sessionToken
                },
                ...stripUndefined(data)
            }),
        deleteSession: (sessionToken)=>p.session.delete({
                where: {
                    sessionToken
                }
            }),
        async createVerificationToken (data) {
            const verificationToken = await p.verificationToken.create(stripUndefined(data));
            if ("id" in verificationToken && verificationToken.id) delete verificationToken.id;
            return verificationToken;
        },
        async useVerificationToken (identifier_token) {
            try {
                const verificationToken = await p.verificationToken.delete({
                    where: {
                        identifier_token
                    }
                });
                if ("id" in verificationToken && verificationToken.id) delete verificationToken.id;
                return verificationToken;
            } catch (error) {
                // If token already used/deleted, just return null
                // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
                if (error && typeof error === "object" && "code" in error && error.code === "P2025") return null;
                throw error;
            }
        },
        async getAccount (providerAccountId, provider) {
            return p.account.findFirst({
                where: {
                    providerAccountId,
                    provider
                }
            });
        },
        async createAuthenticator (data) {
            return p.authenticator.create(stripUndefined(data));
        },
        async getAuthenticator (credentialID) {
            return p.authenticator.findUnique({
                where: {
                    credentialID
                }
            });
        },
        async listAuthenticatorsByUserId (userId) {
            return p.authenticator.findMany({
                where: {
                    userId
                }
            });
        },
        async updateAuthenticatorCounter (credentialID, counter) {
            return p.authenticator.update({
                where: {
                    credentialID
                },
                data: {
                    counter
                }
            });
        }
    };
}
/** @see https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/null-and-undefined */ function stripUndefined(obj) {
    const data = {};
    for(const key in obj)if (obj[key] !== undefined) data[key] = obj[key];
    return {
        data
    };
}
}),
"[project]/node_modules/@google/generative-ai/dist/index.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BlockReason",
    ()=>BlockReason,
    "ChatSession",
    ()=>ChatSession,
    "DynamicRetrievalMode",
    ()=>DynamicRetrievalMode,
    "ExecutableCodeLanguage",
    ()=>ExecutableCodeLanguage,
    "FinishReason",
    ()=>FinishReason,
    "FunctionCallingMode",
    ()=>FunctionCallingMode,
    "GenerativeModel",
    ()=>GenerativeModel,
    "GoogleGenerativeAI",
    ()=>GoogleGenerativeAI,
    "GoogleGenerativeAIAbortError",
    ()=>GoogleGenerativeAIAbortError,
    "GoogleGenerativeAIError",
    ()=>GoogleGenerativeAIError,
    "GoogleGenerativeAIFetchError",
    ()=>GoogleGenerativeAIFetchError,
    "GoogleGenerativeAIRequestInputError",
    ()=>GoogleGenerativeAIRequestInputError,
    "GoogleGenerativeAIResponseError",
    ()=>GoogleGenerativeAIResponseError,
    "HarmBlockThreshold",
    ()=>HarmBlockThreshold,
    "HarmCategory",
    ()=>HarmCategory,
    "HarmProbability",
    ()=>HarmProbability,
    "Outcome",
    ()=>Outcome,
    "POSSIBLE_ROLES",
    ()=>POSSIBLE_ROLES,
    "SchemaType",
    ()=>SchemaType,
    "TaskType",
    ()=>TaskType
]);
/**
 * Contains the list of OpenAPI data types
 * as defined by https://swagger.io/docs/specification/data-models/data-types/
 * @public
 */ var SchemaType;
(function(SchemaType) {
    /** String type. */ SchemaType["STRING"] = "string";
    /** Number type. */ SchemaType["NUMBER"] = "number";
    /** Integer type. */ SchemaType["INTEGER"] = "integer";
    /** Boolean type. */ SchemaType["BOOLEAN"] = "boolean";
    /** Array type. */ SchemaType["ARRAY"] = "array";
    /** Object type. */ SchemaType["OBJECT"] = "object";
})(SchemaType || (SchemaType = {}));
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * @public
 */ var ExecutableCodeLanguage;
(function(ExecutableCodeLanguage) {
    ExecutableCodeLanguage["LANGUAGE_UNSPECIFIED"] = "language_unspecified";
    ExecutableCodeLanguage["PYTHON"] = "python";
})(ExecutableCodeLanguage || (ExecutableCodeLanguage = {}));
/**
 * Possible outcomes of code execution.
 * @public
 */ var Outcome;
(function(Outcome) {
    /**
     * Unspecified status. This value should not be used.
     */ Outcome["OUTCOME_UNSPECIFIED"] = "outcome_unspecified";
    /**
     * Code execution completed successfully.
     */ Outcome["OUTCOME_OK"] = "outcome_ok";
    /**
     * Code execution finished but with a failure. `stderr` should contain the
     * reason.
     */ Outcome["OUTCOME_FAILED"] = "outcome_failed";
    /**
     * Code execution ran for too long, and was cancelled. There may or may not
     * be a partial output present.
     */ Outcome["OUTCOME_DEADLINE_EXCEEDED"] = "outcome_deadline_exceeded";
})(Outcome || (Outcome = {}));
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Possible roles.
 * @public
 */ const POSSIBLE_ROLES = [
    "user",
    "model",
    "function",
    "system"
];
/**
 * Harm categories that would cause prompts or candidates to be blocked.
 * @public
 */ var HarmCategory;
(function(HarmCategory) {
    HarmCategory["HARM_CATEGORY_UNSPECIFIED"] = "HARM_CATEGORY_UNSPECIFIED";
    HarmCategory["HARM_CATEGORY_HATE_SPEECH"] = "HARM_CATEGORY_HATE_SPEECH";
    HarmCategory["HARM_CATEGORY_SEXUALLY_EXPLICIT"] = "HARM_CATEGORY_SEXUALLY_EXPLICIT";
    HarmCategory["HARM_CATEGORY_HARASSMENT"] = "HARM_CATEGORY_HARASSMENT";
    HarmCategory["HARM_CATEGORY_DANGEROUS_CONTENT"] = "HARM_CATEGORY_DANGEROUS_CONTENT";
    HarmCategory["HARM_CATEGORY_CIVIC_INTEGRITY"] = "HARM_CATEGORY_CIVIC_INTEGRITY";
})(HarmCategory || (HarmCategory = {}));
/**
 * Threshold above which a prompt or candidate will be blocked.
 * @public
 */ var HarmBlockThreshold;
(function(HarmBlockThreshold) {
    /** Threshold is unspecified. */ HarmBlockThreshold["HARM_BLOCK_THRESHOLD_UNSPECIFIED"] = "HARM_BLOCK_THRESHOLD_UNSPECIFIED";
    /** Content with NEGLIGIBLE will be allowed. */ HarmBlockThreshold["BLOCK_LOW_AND_ABOVE"] = "BLOCK_LOW_AND_ABOVE";
    /** Content with NEGLIGIBLE and LOW will be allowed. */ HarmBlockThreshold["BLOCK_MEDIUM_AND_ABOVE"] = "BLOCK_MEDIUM_AND_ABOVE";
    /** Content with NEGLIGIBLE, LOW, and MEDIUM will be allowed. */ HarmBlockThreshold["BLOCK_ONLY_HIGH"] = "BLOCK_ONLY_HIGH";
    /** All content will be allowed. */ HarmBlockThreshold["BLOCK_NONE"] = "BLOCK_NONE";
})(HarmBlockThreshold || (HarmBlockThreshold = {}));
/**
 * Probability that a prompt or candidate matches a harm category.
 * @public
 */ var HarmProbability;
(function(HarmProbability) {
    /** Probability is unspecified. */ HarmProbability["HARM_PROBABILITY_UNSPECIFIED"] = "HARM_PROBABILITY_UNSPECIFIED";
    /** Content has a negligible chance of being unsafe. */ HarmProbability["NEGLIGIBLE"] = "NEGLIGIBLE";
    /** Content has a low chance of being unsafe. */ HarmProbability["LOW"] = "LOW";
    /** Content has a medium chance of being unsafe. */ HarmProbability["MEDIUM"] = "MEDIUM";
    /** Content has a high chance of being unsafe. */ HarmProbability["HIGH"] = "HIGH";
})(HarmProbability || (HarmProbability = {}));
/**
 * Reason that a prompt was blocked.
 * @public
 */ var BlockReason;
(function(BlockReason) {
    // A blocked reason was not specified.
    BlockReason["BLOCKED_REASON_UNSPECIFIED"] = "BLOCKED_REASON_UNSPECIFIED";
    // Content was blocked by safety settings.
    BlockReason["SAFETY"] = "SAFETY";
    // Content was blocked, but the reason is uncategorized.
    BlockReason["OTHER"] = "OTHER";
})(BlockReason || (BlockReason = {}));
/**
 * Reason that a candidate finished.
 * @public
 */ var FinishReason;
(function(FinishReason) {
    // Default value. This value is unused.
    FinishReason["FINISH_REASON_UNSPECIFIED"] = "FINISH_REASON_UNSPECIFIED";
    // Natural stop point of the model or provided stop sequence.
    FinishReason["STOP"] = "STOP";
    // The maximum number of tokens as specified in the request was reached.
    FinishReason["MAX_TOKENS"] = "MAX_TOKENS";
    // The candidate content was flagged for safety reasons.
    FinishReason["SAFETY"] = "SAFETY";
    // The candidate content was flagged for recitation reasons.
    FinishReason["RECITATION"] = "RECITATION";
    // The candidate content was flagged for using an unsupported language.
    FinishReason["LANGUAGE"] = "LANGUAGE";
    // Token generation stopped because the content contains forbidden terms.
    FinishReason["BLOCKLIST"] = "BLOCKLIST";
    // Token generation stopped for potentially containing prohibited content.
    FinishReason["PROHIBITED_CONTENT"] = "PROHIBITED_CONTENT";
    // Token generation stopped because the content potentially contains Sensitive Personally Identifiable Information (SPII).
    FinishReason["SPII"] = "SPII";
    // The function call generated by the model is invalid.
    FinishReason["MALFORMED_FUNCTION_CALL"] = "MALFORMED_FUNCTION_CALL";
    // Unknown reason.
    FinishReason["OTHER"] = "OTHER";
})(FinishReason || (FinishReason = {}));
/**
 * Task type for embedding content.
 * @public
 */ var TaskType;
(function(TaskType) {
    TaskType["TASK_TYPE_UNSPECIFIED"] = "TASK_TYPE_UNSPECIFIED";
    TaskType["RETRIEVAL_QUERY"] = "RETRIEVAL_QUERY";
    TaskType["RETRIEVAL_DOCUMENT"] = "RETRIEVAL_DOCUMENT";
    TaskType["SEMANTIC_SIMILARITY"] = "SEMANTIC_SIMILARITY";
    TaskType["CLASSIFICATION"] = "CLASSIFICATION";
    TaskType["CLUSTERING"] = "CLUSTERING";
})(TaskType || (TaskType = {}));
/**
 * @public
 */ var FunctionCallingMode;
(function(FunctionCallingMode) {
    // Unspecified function calling mode. This value should not be used.
    FunctionCallingMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    // Default model behavior, model decides to predict either a function call
    // or a natural language repspose.
    FunctionCallingMode["AUTO"] = "AUTO";
    // Model is constrained to always predicting a function call only.
    // If "allowed_function_names" are set, the predicted function call will be
    // limited to any one of "allowed_function_names", else the predicted
    // function call will be any one of the provided "function_declarations".
    FunctionCallingMode["ANY"] = "ANY";
    // Model will not predict any function call. Model behavior is same as when
    // not passing any function declarations.
    FunctionCallingMode["NONE"] = "NONE";
})(FunctionCallingMode || (FunctionCallingMode = {}));
/**
 * The mode of the predictor to be used in dynamic retrieval.
 * @public
 */ var DynamicRetrievalMode;
(function(DynamicRetrievalMode) {
    // Unspecified function calling mode. This value should not be used.
    DynamicRetrievalMode["MODE_UNSPECIFIED"] = "MODE_UNSPECIFIED";
    // Run retrieval only when system decides it is necessary.
    DynamicRetrievalMode["MODE_DYNAMIC"] = "MODE_DYNAMIC";
})(DynamicRetrievalMode || (DynamicRetrievalMode = {}));
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Basic error type for this SDK.
 * @public
 */ class GoogleGenerativeAIError extends Error {
    constructor(message){
        super(`[GoogleGenerativeAI Error]: ${message}`);
    }
}
/**
 * Errors in the contents of a response from the model. This includes parsing
 * errors, or responses including a safety block reason.
 * @public
 */ class GoogleGenerativeAIResponseError extends GoogleGenerativeAIError {
    constructor(message, response){
        super(message);
        this.response = response;
    }
}
/**
 * Error class covering HTTP errors when calling the server. Includes HTTP
 * status, statusText, and optional details, if provided in the server response.
 * @public
 */ class GoogleGenerativeAIFetchError extends GoogleGenerativeAIError {
    constructor(message, status, statusText, errorDetails){
        super(message);
        this.status = status;
        this.statusText = statusText;
        this.errorDetails = errorDetails;
    }
}
/**
 * Errors in the contents of a request originating from user input.
 * @public
 */ class GoogleGenerativeAIRequestInputError extends GoogleGenerativeAIError {
}
/**
 * Error thrown when a request is aborted, either due to a timeout or
 * intentional cancellation by the user.
 * @public
 */ class GoogleGenerativeAIAbortError extends GoogleGenerativeAIError {
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com";
const DEFAULT_API_VERSION = "v1beta";
/**
 * We can't `require` package.json if this runs on web. We will use rollup to
 * swap in the version number here at build time.
 */ const PACKAGE_VERSION = "0.24.1";
const PACKAGE_LOG_HEADER = "genai-js";
var Task;
(function(Task) {
    Task["GENERATE_CONTENT"] = "generateContent";
    Task["STREAM_GENERATE_CONTENT"] = "streamGenerateContent";
    Task["COUNT_TOKENS"] = "countTokens";
    Task["EMBED_CONTENT"] = "embedContent";
    Task["BATCH_EMBED_CONTENTS"] = "batchEmbedContents";
})(Task || (Task = {}));
class RequestUrl {
    constructor(model, task, apiKey, stream, requestOptions){
        this.model = model;
        this.task = task;
        this.apiKey = apiKey;
        this.stream = stream;
        this.requestOptions = requestOptions;
    }
    toString() {
        var _a, _b;
        const apiVersion = ((_a = this.requestOptions) === null || _a === void 0 ? void 0 : _a.apiVersion) || DEFAULT_API_VERSION;
        const baseUrl = ((_b = this.requestOptions) === null || _b === void 0 ? void 0 : _b.baseUrl) || DEFAULT_BASE_URL;
        let url = `${baseUrl}/${apiVersion}/${this.model}:${this.task}`;
        if (this.stream) {
            url += "?alt=sse";
        }
        return url;
    }
}
/**
 * Simple, but may become more complex if we add more versions to log.
 */ function getClientHeaders(requestOptions) {
    const clientHeaders = [];
    if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.apiClient) {
        clientHeaders.push(requestOptions.apiClient);
    }
    clientHeaders.push(`${PACKAGE_LOG_HEADER}/${PACKAGE_VERSION}`);
    return clientHeaders.join(" ");
}
async function getHeaders(url) {
    var _a;
    const headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("x-goog-api-client", getClientHeaders(url.requestOptions));
    headers.append("x-goog-api-key", url.apiKey);
    let customHeaders = (_a = url.requestOptions) === null || _a === void 0 ? void 0 : _a.customHeaders;
    if (customHeaders) {
        if (!(customHeaders instanceof Headers)) {
            try {
                customHeaders = new Headers(customHeaders);
            } catch (e) {
                throw new GoogleGenerativeAIRequestInputError(`unable to convert customHeaders value ${JSON.stringify(customHeaders)} to Headers: ${e.message}`);
            }
        }
        for (const [headerName, headerValue] of customHeaders.entries()){
            if (headerName === "x-goog-api-key") {
                throw new GoogleGenerativeAIRequestInputError(`Cannot set reserved header name ${headerName}`);
            } else if (headerName === "x-goog-api-client") {
                throw new GoogleGenerativeAIRequestInputError(`Header name ${headerName} can only be set using the apiClient field`);
            }
            headers.append(headerName, headerValue);
        }
    }
    return headers;
}
async function constructModelRequest(model, task, apiKey, stream, body, requestOptions) {
    const url = new RequestUrl(model, task, apiKey, stream, requestOptions);
    return {
        url: url.toString(),
        fetchOptions: Object.assign(Object.assign({}, buildFetchOptions(requestOptions)), {
            method: "POST",
            headers: await getHeaders(url),
            body
        })
    };
}
async function makeModelRequest(model, task, apiKey, stream, body, requestOptions = {}, // Allows this to be stubbed for tests
fetchFn = fetch) {
    const { url, fetchOptions } = await constructModelRequest(model, task, apiKey, stream, body, requestOptions);
    return makeRequest(url, fetchOptions, fetchFn);
}
async function makeRequest(url, fetchOptions, fetchFn = fetch) {
    let response;
    try {
        response = await fetchFn(url, fetchOptions);
    } catch (e) {
        handleResponseError(e, url);
    }
    if (!response.ok) {
        await handleResponseNotOk(response, url);
    }
    return response;
}
function handleResponseError(e, url) {
    let err = e;
    if (err.name === "AbortError") {
        err = new GoogleGenerativeAIAbortError(`Request aborted when fetching ${url.toString()}: ${e.message}`);
        err.stack = e.stack;
    } else if (!(e instanceof GoogleGenerativeAIFetchError || e instanceof GoogleGenerativeAIRequestInputError)) {
        err = new GoogleGenerativeAIError(`Error fetching from ${url.toString()}: ${e.message}`);
        err.stack = e.stack;
    }
    throw err;
}
async function handleResponseNotOk(response, url) {
    let message = "";
    let errorDetails;
    try {
        const json = await response.json();
        message = json.error.message;
        if (json.error.details) {
            message += ` ${JSON.stringify(json.error.details)}`;
            errorDetails = json.error.details;
        }
    } catch (e) {
    // ignored
    }
    throw new GoogleGenerativeAIFetchError(`Error fetching from ${url.toString()}: [${response.status} ${response.statusText}] ${message}`, response.status, response.statusText, errorDetails);
}
/**
 * Generates the request options to be passed to the fetch API.
 * @param requestOptions - The user-defined request options.
 * @returns The generated request options.
 */ function buildFetchOptions(requestOptions) {
    const fetchOptions = {};
    if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) !== undefined || (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
        const controller = new AbortController();
        if ((requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.timeout) >= 0) {
            setTimeout(()=>controller.abort(), requestOptions.timeout);
        }
        if (requestOptions === null || requestOptions === void 0 ? void 0 : requestOptions.signal) {
            requestOptions.signal.addEventListener("abort", ()=>{
                controller.abort();
            });
        }
        fetchOptions.signal = controller.signal;
    }
    return fetchOptions;
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Adds convenience helper methods to a response object, including stream
 * chunks (as long as each chunk is a complete GenerateContentResponse JSON).
 */ function addHelpers(response) {
    response.text = ()=>{
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` + `candidates. Returning text from the first candidate only. ` + `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            return getText(response);
        } else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Text not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return "";
    };
    /**
     * TODO: remove at next major version
     */ response.functionCall = ()=>{
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` + `candidates. Returning function calls from the first candidate only. ` + `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            console.warn(`response.functionCall() is deprecated. ` + `Use response.functionCalls() instead.`);
            return getFunctionCalls(response)[0];
        } else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return undefined;
    };
    response.functionCalls = ()=>{
        if (response.candidates && response.candidates.length > 0) {
            if (response.candidates.length > 1) {
                console.warn(`This response had ${response.candidates.length} ` + `candidates. Returning function calls from the first candidate only. ` + `Access response.candidates directly to use the other candidates.`);
            }
            if (hadBadFinishReason(response.candidates[0])) {
                throw new GoogleGenerativeAIResponseError(`${formatBlockErrorMessage(response)}`, response);
            }
            return getFunctionCalls(response);
        } else if (response.promptFeedback) {
            throw new GoogleGenerativeAIResponseError(`Function call not available. ${formatBlockErrorMessage(response)}`, response);
        }
        return undefined;
    };
    return response;
}
/**
 * Returns all text found in all parts of first candidate.
 */ function getText(response) {
    var _a, _b, _c, _d;
    const textStrings = [];
    if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
        for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts){
            if (part.text) {
                textStrings.push(part.text);
            }
            if (part.executableCode) {
                textStrings.push("\n```" + part.executableCode.language + "\n" + part.executableCode.code + "\n```\n");
            }
            if (part.codeExecutionResult) {
                textStrings.push("\n```\n" + part.codeExecutionResult.output + "\n```\n");
            }
        }
    }
    if (textStrings.length > 0) {
        return textStrings.join("");
    } else {
        return "";
    }
}
/**
 * Returns functionCall of first candidate.
 */ function getFunctionCalls(response) {
    var _a, _b, _c, _d;
    const functionCalls = [];
    if ((_b = (_a = response.candidates) === null || _a === void 0 ? void 0 : _a[0].content) === null || _b === void 0 ? void 0 : _b.parts) {
        for (const part of (_d = (_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0].content) === null || _d === void 0 ? void 0 : _d.parts){
            if (part.functionCall) {
                functionCalls.push(part.functionCall);
            }
        }
    }
    if (functionCalls.length > 0) {
        return functionCalls;
    } else {
        return undefined;
    }
}
const badFinishReasons = [
    FinishReason.RECITATION,
    FinishReason.SAFETY,
    FinishReason.LANGUAGE
];
function hadBadFinishReason(candidate) {
    return !!candidate.finishReason && badFinishReasons.includes(candidate.finishReason);
}
function formatBlockErrorMessage(response) {
    var _a, _b, _c;
    let message = "";
    if ((!response.candidates || response.candidates.length === 0) && response.promptFeedback) {
        message += "Response was blocked";
        if ((_a = response.promptFeedback) === null || _a === void 0 ? void 0 : _a.blockReason) {
            message += ` due to ${response.promptFeedback.blockReason}`;
        }
        if ((_b = response.promptFeedback) === null || _b === void 0 ? void 0 : _b.blockReasonMessage) {
            message += `: ${response.promptFeedback.blockReasonMessage}`;
        }
    } else if ((_c = response.candidates) === null || _c === void 0 ? void 0 : _c[0]) {
        const firstCandidate = response.candidates[0];
        if (hadBadFinishReason(firstCandidate)) {
            message += `Candidate was blocked due to ${firstCandidate.finishReason}`;
            if (firstCandidate.finishMessage) {
                message += `: ${firstCandidate.finishMessage}`;
            }
        }
    }
    return message;
}
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */ /* global Reflect, Promise, SuppressedError, Symbol */ function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}
function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
        return this;
    }, i;
    //TURBOPACK unreachable
    ;
    function verb(n) {
        if (g[n]) i[n] = function(v) {
            return new Promise(function(a, b) {
                q.push([
                    n,
                    v,
                    a,
                    b
                ]) > 1 || resume(n, v);
            });
        };
    }
    function resume(n, v) {
        try {
            step(g[n](v));
        } catch (e) {
            settle(q[0][3], e);
        }
    }
    function step(r) {
        r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
    }
    function fulfill(value) {
        resume("next", value);
    }
    function reject(value) {
        resume("throw", value);
    }
    function settle(f, v) {
        if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]);
    }
}
typeof SuppressedError === "function" ? SuppressedError : function(error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ const responseLineRE = /^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;
/**
 * Process a response.body stream from the backend and return an
 * iterator that provides one complete GenerateContentResponse at a time
 * and a promise that resolves with a single aggregated
 * GenerateContentResponse.
 *
 * @param response - Response from a fetch call
 */ function processStream(response) {
    const inputStream = response.body.pipeThrough(new TextDecoderStream("utf8", {
        fatal: true
    }));
    const responseStream = getResponseStream(inputStream);
    const [stream1, stream2] = responseStream.tee();
    return {
        stream: generateResponseSequence(stream1),
        response: getResponsePromise(stream2)
    };
}
async function getResponsePromise(stream) {
    const allResponses = [];
    const reader = stream.getReader();
    while(true){
        const { done, value } = await reader.read();
        if (done) {
            return addHelpers(aggregateResponses(allResponses));
        }
        allResponses.push(value);
    }
}
function generateResponseSequence(stream) {
    return __asyncGenerator(this, arguments, function* generateResponseSequence_1() {
        const reader = stream.getReader();
        while(true){
            const { value, done } = yield __await(reader.read());
            if (done) {
                break;
            }
            yield yield __await(addHelpers(value));
        }
    });
}
/**
 * Reads a raw stream from the fetch response and join incomplete
 * chunks, returning a new stream that provides a single complete
 * GenerateContentResponse in each iteration.
 */ function getResponseStream(inputStream) {
    const reader = inputStream.getReader();
    const stream = new ReadableStream({
        start (controller) {
            let currentText = "";
            return pump();
            //TURBOPACK unreachable
            ;
            function pump() {
                return reader.read().then(({ value, done })=>{
                    if (done) {
                        if (currentText.trim()) {
                            controller.error(new GoogleGenerativeAIError("Failed to parse stream"));
                            return;
                        }
                        controller.close();
                        return;
                    }
                    currentText += value;
                    let match = currentText.match(responseLineRE);
                    let parsedResponse;
                    while(match){
                        try {
                            parsedResponse = JSON.parse(match[1]);
                        } catch (e) {
                            controller.error(new GoogleGenerativeAIError(`Error parsing JSON response: "${match[1]}"`));
                            return;
                        }
                        controller.enqueue(parsedResponse);
                        currentText = currentText.substring(match[0].length);
                        match = currentText.match(responseLineRE);
                    }
                    return pump();
                }).catch((e)=>{
                    let err = e;
                    err.stack = e.stack;
                    if (err.name === "AbortError") {
                        err = new GoogleGenerativeAIAbortError("Request aborted when reading from the stream");
                    } else {
                        err = new GoogleGenerativeAIError("Error reading from the stream");
                    }
                    throw err;
                });
            }
        }
    });
    return stream;
}
/**
 * Aggregates an array of `GenerateContentResponse`s into a single
 * GenerateContentResponse.
 */ function aggregateResponses(responses) {
    const lastResponse = responses[responses.length - 1];
    const aggregatedResponse = {
        promptFeedback: lastResponse === null || lastResponse === void 0 ? void 0 : lastResponse.promptFeedback
    };
    for (const response of responses){
        if (response.candidates) {
            let candidateIndex = 0;
            for (const candidate of response.candidates){
                if (!aggregatedResponse.candidates) {
                    aggregatedResponse.candidates = [];
                }
                if (!aggregatedResponse.candidates[candidateIndex]) {
                    aggregatedResponse.candidates[candidateIndex] = {
                        index: candidateIndex
                    };
                }
                // Keep overwriting, the last one will be final
                aggregatedResponse.candidates[candidateIndex].citationMetadata = candidate.citationMetadata;
                aggregatedResponse.candidates[candidateIndex].groundingMetadata = candidate.groundingMetadata;
                aggregatedResponse.candidates[candidateIndex].finishReason = candidate.finishReason;
                aggregatedResponse.candidates[candidateIndex].finishMessage = candidate.finishMessage;
                aggregatedResponse.candidates[candidateIndex].safetyRatings = candidate.safetyRatings;
                /**
                 * Candidates should always have content and parts, but this handles
                 * possible malformed responses.
                 */ if (candidate.content && candidate.content.parts) {
                    if (!aggregatedResponse.candidates[candidateIndex].content) {
                        aggregatedResponse.candidates[candidateIndex].content = {
                            role: candidate.content.role || "user",
                            parts: []
                        };
                    }
                    const newPart = {};
                    for (const part of candidate.content.parts){
                        if (part.text) {
                            newPart.text = part.text;
                        }
                        if (part.functionCall) {
                            newPart.functionCall = part.functionCall;
                        }
                        if (part.executableCode) {
                            newPart.executableCode = part.executableCode;
                        }
                        if (part.codeExecutionResult) {
                            newPart.codeExecutionResult = part.codeExecutionResult;
                        }
                        if (Object.keys(newPart).length === 0) {
                            newPart.text = "";
                        }
                        aggregatedResponse.candidates[candidateIndex].content.parts.push(newPart);
                    }
                }
            }
            candidateIndex++;
        }
        if (response.usageMetadata) {
            aggregatedResponse.usageMetadata = response.usageMetadata;
        }
    }
    return aggregatedResponse;
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ async function generateContentStream(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.STREAM_GENERATE_CONTENT, apiKey, /* stream */ true, JSON.stringify(params), requestOptions);
    return processStream(response);
}
async function generateContent(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.GENERATE_CONTENT, apiKey, /* stream */ false, JSON.stringify(params), requestOptions);
    const responseJson = await response.json();
    const enhancedResponse = addHelpers(responseJson);
    return {
        response: enhancedResponse
    };
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ function formatSystemInstruction(input) {
    // null or undefined
    if (input == null) {
        return undefined;
    } else if (typeof input === "string") {
        return {
            role: "system",
            parts: [
                {
                    text: input
                }
            ]
        };
    } else if (input.text) {
        return {
            role: "system",
            parts: [
                input
            ]
        };
    } else if (input.parts) {
        if (!input.role) {
            return {
                role: "system",
                parts: input.parts
            };
        } else {
            return input;
        }
    }
}
function formatNewContent(request) {
    let newParts = [];
    if (typeof request === "string") {
        newParts = [
            {
                text: request
            }
        ];
    } else {
        for (const partOrString of request){
            if (typeof partOrString === "string") {
                newParts.push({
                    text: partOrString
                });
            } else {
                newParts.push(partOrString);
            }
        }
    }
    return assignRoleToPartsAndValidateSendMessageRequest(newParts);
}
/**
 * When multiple Part types (i.e. FunctionResponsePart and TextPart) are
 * passed in a single Part array, we may need to assign different roles to each
 * part. Currently only FunctionResponsePart requires a role other than 'user'.
 * @private
 * @param parts Array of parts to pass to the model
 * @returns Array of content items
 */ function assignRoleToPartsAndValidateSendMessageRequest(parts) {
    const userContent = {
        role: "user",
        parts: []
    };
    const functionContent = {
        role: "function",
        parts: []
    };
    let hasUserContent = false;
    let hasFunctionContent = false;
    for (const part of parts){
        if ("functionResponse" in part) {
            functionContent.parts.push(part);
            hasFunctionContent = true;
        } else {
            userContent.parts.push(part);
            hasUserContent = true;
        }
    }
    if (hasUserContent && hasFunctionContent) {
        throw new GoogleGenerativeAIError("Within a single message, FunctionResponse cannot be mixed with other type of part in the request for sending chat message.");
    }
    if (!hasUserContent && !hasFunctionContent) {
        throw new GoogleGenerativeAIError("No content is provided for sending chat message.");
    }
    if (hasUserContent) {
        return userContent;
    }
    return functionContent;
}
function formatCountTokensInput(params, modelParams) {
    var _a;
    let formattedGenerateContentRequest = {
        model: modelParams === null || modelParams === void 0 ? void 0 : modelParams.model,
        generationConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.generationConfig,
        safetySettings: modelParams === null || modelParams === void 0 ? void 0 : modelParams.safetySettings,
        tools: modelParams === null || modelParams === void 0 ? void 0 : modelParams.tools,
        toolConfig: modelParams === null || modelParams === void 0 ? void 0 : modelParams.toolConfig,
        systemInstruction: modelParams === null || modelParams === void 0 ? void 0 : modelParams.systemInstruction,
        cachedContent: (_a = modelParams === null || modelParams === void 0 ? void 0 : modelParams.cachedContent) === null || _a === void 0 ? void 0 : _a.name,
        contents: []
    };
    const containsGenerateContentRequest = params.generateContentRequest != null;
    if (params.contents) {
        if (containsGenerateContentRequest) {
            throw new GoogleGenerativeAIRequestInputError("CountTokensRequest must have one of contents or generateContentRequest, not both.");
        }
        formattedGenerateContentRequest.contents = params.contents;
    } else if (containsGenerateContentRequest) {
        formattedGenerateContentRequest = Object.assign(Object.assign({}, formattedGenerateContentRequest), params.generateContentRequest);
    } else {
        // Array or string
        const content = formatNewContent(params);
        formattedGenerateContentRequest.contents = [
            content
        ];
    }
    return {
        generateContentRequest: formattedGenerateContentRequest
    };
}
function formatGenerateContentInput(params) {
    let formattedRequest;
    if (params.contents) {
        formattedRequest = params;
    } else {
        // Array or string
        const content = formatNewContent(params);
        formattedRequest = {
            contents: [
                content
            ]
        };
    }
    if (params.systemInstruction) {
        formattedRequest.systemInstruction = formatSystemInstruction(params.systemInstruction);
    }
    return formattedRequest;
}
function formatEmbedContentInput(params) {
    if (typeof params === "string" || Array.isArray(params)) {
        const content = formatNewContent(params);
        return {
            content
        };
    }
    return params;
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ // https://ai.google.dev/api/rest/v1beta/Content#part
const VALID_PART_FIELDS = [
    "text",
    "inlineData",
    "functionCall",
    "functionResponse",
    "executableCode",
    "codeExecutionResult"
];
const VALID_PARTS_PER_ROLE = {
    user: [
        "text",
        "inlineData"
    ],
    function: [
        "functionResponse"
    ],
    model: [
        "text",
        "functionCall",
        "executableCode",
        "codeExecutionResult"
    ],
    // System instructions shouldn't be in history anyway.
    system: [
        "text"
    ]
};
function validateChatHistory(history) {
    let prevContent = false;
    for (const currContent of history){
        const { role, parts } = currContent;
        if (!prevContent && role !== "user") {
            throw new GoogleGenerativeAIError(`First content should be with role 'user', got ${role}`);
        }
        if (!POSSIBLE_ROLES.includes(role)) {
            throw new GoogleGenerativeAIError(`Each item should include role field. Got ${role} but valid roles are: ${JSON.stringify(POSSIBLE_ROLES)}`);
        }
        if (!Array.isArray(parts)) {
            throw new GoogleGenerativeAIError("Content should have 'parts' property with an array of Parts");
        }
        if (parts.length === 0) {
            throw new GoogleGenerativeAIError("Each Content should have at least one part");
        }
        const countFields = {
            text: 0,
            inlineData: 0,
            functionCall: 0,
            functionResponse: 0,
            fileData: 0,
            executableCode: 0,
            codeExecutionResult: 0
        };
        for (const part of parts){
            for (const key of VALID_PART_FIELDS){
                if (key in part) {
                    countFields[key] += 1;
                }
            }
        }
        const validParts = VALID_PARTS_PER_ROLE[role];
        for (const key of VALID_PART_FIELDS){
            if (!validParts.includes(key) && countFields[key] > 0) {
                throw new GoogleGenerativeAIError(`Content with role '${role}' can't contain '${key}' part`);
            }
        }
        prevContent = true;
    }
}
/**
 * Returns true if the response is valid (could be appended to the history), flase otherwise.
 */ function isValidResponse(response) {
    var _a;
    if (response.candidates === undefined || response.candidates.length === 0) {
        return false;
    }
    const content = (_a = response.candidates[0]) === null || _a === void 0 ? void 0 : _a.content;
    if (content === undefined) {
        return false;
    }
    if (content.parts === undefined || content.parts.length === 0) {
        return false;
    }
    for (const part of content.parts){
        if (part === undefined || Object.keys(part).length === 0) {
            return false;
        }
        if (part.text !== undefined && part.text === "") {
            return false;
        }
    }
    return true;
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Do not log a message for this error.
 */ const SILENT_ERROR = "SILENT_ERROR";
/**
 * ChatSession class that enables sending chat messages and stores
 * history of sent and received messages so far.
 *
 * @public
 */ class ChatSession {
    constructor(apiKey, model, params, _requestOptions = {}){
        this.model = model;
        this.params = params;
        this._requestOptions = _requestOptions;
        this._history = [];
        this._sendPromise = Promise.resolve();
        this._apiKey = apiKey;
        if (params === null || params === void 0 ? void 0 : params.history) {
            validateChatHistory(params.history);
            this._history = params.history;
        }
    }
    /**
     * Gets the chat history so far. Blocked prompts are not added to history.
     * Blocked candidates are not added to history, nor are the prompts that
     * generated them.
     */ async getHistory() {
        await this._sendPromise;
        return this._history;
    }
    /**
     * Sends a chat message and receives a non-streaming
     * {@link GenerateContentResult}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async sendMessage(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
            safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
            generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
            tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
            toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
            systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
            cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
            contents: [
                ...this._history,
                newContent
            ]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        let finalResult;
        // Add onto the chain.
        this._sendPromise = this._sendPromise.then(()=>generateContent(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions)).then((result)=>{
            var _a;
            if (isValidResponse(result.response)) {
                this._history.push(newContent);
                const responseContent = Object.assign({
                    parts: [],
                    // Response seems to come back without a role set.
                    role: "model"
                }, (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0].content);
                this._history.push(responseContent);
            } else {
                const blockErrorMessage = formatBlockErrorMessage(result.response);
                if (blockErrorMessage) {
                    console.warn(`sendMessage() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
                }
            }
            finalResult = result;
        }).catch((e)=>{
            // Resets _sendPromise to avoid subsequent calls failing and throw error.
            this._sendPromise = Promise.resolve();
            throw e;
        });
        await this._sendPromise;
        return finalResult;
    }
    /**
     * Sends a chat message and receives the response as a
     * {@link GenerateContentStreamResult} containing an iterable stream
     * and a response promise.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async sendMessageStream(request, requestOptions = {}) {
        var _a, _b, _c, _d, _e, _f;
        await this._sendPromise;
        const newContent = formatNewContent(request);
        const generateContentRequest = {
            safetySettings: (_a = this.params) === null || _a === void 0 ? void 0 : _a.safetySettings,
            generationConfig: (_b = this.params) === null || _b === void 0 ? void 0 : _b.generationConfig,
            tools: (_c = this.params) === null || _c === void 0 ? void 0 : _c.tools,
            toolConfig: (_d = this.params) === null || _d === void 0 ? void 0 : _d.toolConfig,
            systemInstruction: (_e = this.params) === null || _e === void 0 ? void 0 : _e.systemInstruction,
            cachedContent: (_f = this.params) === null || _f === void 0 ? void 0 : _f.cachedContent,
            contents: [
                ...this._history,
                newContent
            ]
        };
        const chatSessionRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        const streamPromise = generateContentStream(this._apiKey, this.model, generateContentRequest, chatSessionRequestOptions);
        // Add onto the chain.
        this._sendPromise = this._sendPromise.then(()=>streamPromise)// This must be handled to avoid unhandled rejection, but jump
        // to the final catch block with a label to not log this error.
        .catch((_ignored)=>{
            throw new Error(SILENT_ERROR);
        }).then((streamResult)=>streamResult.response).then((response)=>{
            if (isValidResponse(response)) {
                this._history.push(newContent);
                const responseContent = Object.assign({}, response.candidates[0].content);
                // Response seems to come back without a role set.
                if (!responseContent.role) {
                    responseContent.role = "model";
                }
                this._history.push(responseContent);
            } else {
                const blockErrorMessage = formatBlockErrorMessage(response);
                if (blockErrorMessage) {
                    console.warn(`sendMessageStream() was unsuccessful. ${blockErrorMessage}. Inspect response object for details.`);
                }
            }
        }).catch((e)=>{
            // Errors in streamPromise are already catchable by the user as
            // streamPromise is returned.
            // Avoid duplicating the error message in logs.
            if (e.message !== SILENT_ERROR) {
                // Users do not have access to _sendPromise to catch errors
                // downstream from streamPromise, so they should not throw.
                console.error(e);
            }
        });
        return streamPromise;
    }
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ async function countTokens(apiKey, model, params, singleRequestOptions) {
    const response = await makeModelRequest(model, Task.COUNT_TOKENS, apiKey, false, JSON.stringify(params), singleRequestOptions);
    return response.json();
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ async function embedContent(apiKey, model, params, requestOptions) {
    const response = await makeModelRequest(model, Task.EMBED_CONTENT, apiKey, false, JSON.stringify(params), requestOptions);
    return response.json();
}
async function batchEmbedContents(apiKey, model, params, requestOptions) {
    const requestsWithModel = params.requests.map((request)=>{
        return Object.assign(Object.assign({}, request), {
            model
        });
    });
    const response = await makeModelRequest(model, Task.BATCH_EMBED_CONTENTS, apiKey, false, JSON.stringify({
        requests: requestsWithModel
    }), requestOptions);
    return response.json();
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Class for generative model APIs.
 * @public
 */ class GenerativeModel {
    constructor(apiKey, modelParams, _requestOptions = {}){
        this.apiKey = apiKey;
        this._requestOptions = _requestOptions;
        if (modelParams.model.includes("/")) {
            // Models may be named "models/model-name" or "tunedModels/model-name"
            this.model = modelParams.model;
        } else {
            // If path is not included, assume it's a non-tuned model.
            this.model = `models/${modelParams.model}`;
        }
        this.generationConfig = modelParams.generationConfig || {};
        this.safetySettings = modelParams.safetySettings || [];
        this.tools = modelParams.tools;
        this.toolConfig = modelParams.toolConfig;
        this.systemInstruction = formatSystemInstruction(modelParams.systemInstruction);
        this.cachedContent = modelParams.cachedContent;
    }
    /**
     * Makes a single non-streaming call to the model
     * and returns an object containing a single {@link GenerateContentResponse}.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async generateContent(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContent(this.apiKey, this.model, Object.assign({
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
            tools: this.tools,
            toolConfig: this.toolConfig,
            systemInstruction: this.systemInstruction,
            cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name
        }, formattedParams), generativeModelRequestOptions);
    }
    /**
     * Makes a single streaming call to the model and returns an object
     * containing an iterable stream that iterates over all chunks in the
     * streaming response as well as a promise that returns the final
     * aggregated response.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async generateContentStream(request, requestOptions = {}) {
        var _a;
        const formattedParams = formatGenerateContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return generateContentStream(this.apiKey, this.model, Object.assign({
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
            tools: this.tools,
            toolConfig: this.toolConfig,
            systemInstruction: this.systemInstruction,
            cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name
        }, formattedParams), generativeModelRequestOptions);
    }
    /**
     * Gets a new {@link ChatSession} instance which can be used for
     * multi-turn chats.
     */ startChat(startChatParams) {
        var _a;
        return new ChatSession(this.apiKey, this.model, Object.assign({
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
            tools: this.tools,
            toolConfig: this.toolConfig,
            systemInstruction: this.systemInstruction,
            cachedContent: (_a = this.cachedContent) === null || _a === void 0 ? void 0 : _a.name
        }, startChatParams), this._requestOptions);
    }
    /**
     * Counts the tokens in the provided request.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async countTokens(request, requestOptions = {}) {
        const formattedParams = formatCountTokensInput(request, {
            model: this.model,
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
            tools: this.tools,
            toolConfig: this.toolConfig,
            systemInstruction: this.systemInstruction,
            cachedContent: this.cachedContent
        });
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return countTokens(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
    }
    /**
     * Embeds the provided content.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async embedContent(request, requestOptions = {}) {
        const formattedParams = formatEmbedContentInput(request);
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return embedContent(this.apiKey, this.model, formattedParams, generativeModelRequestOptions);
    }
    /**
     * Embeds an array of {@link EmbedContentRequest}s.
     *
     * Fields set in the optional {@link SingleRequestOptions} parameter will
     * take precedence over the {@link RequestOptions} values provided to
     * {@link GoogleGenerativeAI.getGenerativeModel }.
     */ async batchEmbedContents(batchEmbedContentRequest, requestOptions = {}) {
        const generativeModelRequestOptions = Object.assign(Object.assign({}, this._requestOptions), requestOptions);
        return batchEmbedContents(this.apiKey, this.model, batchEmbedContentRequest, generativeModelRequestOptions);
    }
}
/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */ /**
 * Top-level class for this SDK
 * @public
 */ class GoogleGenerativeAI {
    constructor(apiKey){
        this.apiKey = apiKey;
    }
    /**
     * Gets a {@link GenerativeModel} instance for the provided model name.
     */ getGenerativeModel(modelParams, requestOptions) {
        if (!modelParams.model) {
            throw new GoogleGenerativeAIError(`Must provide a model name. ` + `Example: genai.getGenerativeModel({ model: 'my-model-name' })`);
        }
        return new GenerativeModel(this.apiKey, modelParams, requestOptions);
    }
    /**
     * Creates a {@link GenerativeModel} instance from provided content cache.
     */ getGenerativeModelFromCachedContent(cachedContent, modelParams, requestOptions) {
        if (!cachedContent.name) {
            throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `name` field.");
        }
        if (!cachedContent.model) {
            throw new GoogleGenerativeAIRequestInputError("Cached content must contain a `model` field.");
        }
        /**
         * Not checking tools and toolConfig for now as it would require a deep
         * equality comparison and isn't likely to be a common case.
         */ const disallowedDuplicates = [
            "model",
            "systemInstruction"
        ];
        for (const key of disallowedDuplicates){
            if ((modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) && cachedContent[key] && (modelParams === null || modelParams === void 0 ? void 0 : modelParams[key]) !== cachedContent[key]) {
                if (key === "model") {
                    const modelParamsComp = modelParams.model.startsWith("models/") ? modelParams.model.replace("models/", "") : modelParams.model;
                    const cachedContentComp = cachedContent.model.startsWith("models/") ? cachedContent.model.replace("models/", "") : cachedContent.model;
                    if (modelParamsComp === cachedContentComp) {
                        continue;
                    }
                }
                throw new GoogleGenerativeAIRequestInputError(`Different value for "${key}" specified in modelParams` + ` (${modelParams[key]}) and cachedContent (${cachedContent[key]})`);
            }
        }
        const modelParamsFromCache = Object.assign(Object.assign({}, modelParams), {
            model: cachedContent.model,
            tools: cachedContent.tools,
            toolConfig: cachedContent.toolConfig,
            systemInstruction: cachedContent.systemInstruction,
            cachedContent
        });
        return new GenerativeModel(this.apiKey, modelParamsFromCache, requestOptions);
    }
}
;
}),
"[project]/node_modules/@panva/hkdf/dist/node/esm/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>hkdf,
    "hkdf",
    ()=>hkdf
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$node$2f$esm$2f$runtime$2f$hkdf$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@panva/hkdf/dist/node/esm/runtime/hkdf.js [app-route] (ecmascript)");
;
function normalizeDigest(digest) {
    switch(digest){
        case 'sha256':
        case 'sha384':
        case 'sha512':
        case 'sha1':
            return digest;
        default:
            throw new TypeError('unsupported "digest" value');
    }
}
function normalizeUint8Array(input, label) {
    if (typeof input === 'string') return new TextEncoder().encode(input);
    if (!(input instanceof Uint8Array)) throw new TypeError(`"${label}"" must be an instance of Uint8Array or a string`);
    return input;
}
function normalizeIkm(input) {
    const ikm = normalizeUint8Array(input, 'ikm');
    if (!ikm.byteLength) throw new TypeError(`"ikm" must be at least one byte in length`);
    return ikm;
}
function normalizeInfo(input) {
    const info = normalizeUint8Array(input, 'info');
    if (info.byteLength > 1024) {
        throw TypeError('"info" must not contain more than 1024 bytes');
    }
    return info;
}
function normalizeKeylen(input, digest) {
    if (typeof input !== 'number' || !Number.isInteger(input) || input < 1) {
        throw new TypeError('"keylen" must be a positive integer');
    }
    const hashlen = parseInt(digest.substr(3), 10) >> 3 || 20;
    if (input > 255 * hashlen) {
        throw new TypeError('"keylen" too large');
    }
    return input;
}
async function hkdf(digest, ikm, salt, info, keylen) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$node$2f$esm$2f$runtime$2f$hkdf$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(normalizeDigest(digest), normalizeIkm(ikm), normalizeUint8Array(salt, 'salt'), normalizeInfo(info), normalizeKeylen(keylen, digest));
}
;
}),
"[project]/node_modules/@panva/hkdf/dist/node/esm/runtime/fallback.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
;
const __TURBOPACK__default__export__ = (digest, ikm, salt, info, keylen)=>{
    const hashlen = parseInt(digest.substr(3), 10) >> 3 || 20;
    const prk = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])(digest, salt.byteLength ? salt : new Uint8Array(hashlen)).update(ikm).digest();
    const N = Math.ceil(keylen / hashlen);
    const T = new Uint8Array(hashlen * N + info.byteLength + 1);
    let prev = 0;
    let start = 0;
    for(let c = 1; c <= N; c++){
        T.set(info, start);
        T[start + info.byteLength] = c;
        T.set((0, __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["createHmac"])(digest, prk).update(T.subarray(prev, start + info.byteLength + 1)).digest(), start);
        prev = start;
        start += hashlen;
    }
    return T.slice(0, keylen);
};
}),
"[project]/node_modules/@panva/hkdf/dist/node/esm/runtime/hkdf.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/crypto [external] (crypto, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$node$2f$esm$2f$runtime$2f$fallback$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@panva/hkdf/dist/node/esm/runtime/fallback.js [app-route] (ecmascript)");
;
;
let hkdf;
if (typeof __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["hkdf"] === 'function' && !process.versions.electron) {
    hkdf = async (...args)=>new Promise((resolve, reject)=>{
            __TURBOPACK__imported__module__$5b$externals$5d2f$crypto__$5b$external$5d$__$28$crypto$2c$__cjs$29$__["hkdf"](...args, (err, arrayBuffer)=>{
                if (err) reject(err);
                else resolve(new Uint8Array(arrayBuffer));
            });
        });
}
const __TURBOPACK__default__export__ = async (digest, ikm, salt, info, keylen)=>(hkdf || __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$panva$2f$hkdf$2f$dist$2f$node$2f$esm$2f$runtime$2f$fallback$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["default"])(digest, ikm, salt, info, keylen);
}),
"[project]/node_modules/next-auth/index.js [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NextAuth
]);
/**
 * _If you are looking to migrate from v4, visit the [Upgrade Guide (v5)](https://authjs.dev/getting-started/migrating-to-v5)._
 *
 * ## Installation
 *
 * ```bash npm2yarn
 * npm install next-auth@beta
 * ```
 *
 * ## Environment variable inference
 *
 * `NEXTAUTH_URL` and `NEXTAUTH_SECRET` have been inferred since v4.
 *
 * Since NextAuth.js v5 can also automatically infer environment variables that are prefixed with `AUTH_`.
 *
 * For example `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` will be used as the `clientId` and `clientSecret` options for the GitHub provider.
 *
 * :::tip
 * The environment variable name inferring has the following format for OAuth providers: `AUTH_{PROVIDER}_{ID|SECRET}`.
 *
 * `PROVIDER` is the uppercase snake case version of the provider's id, followed by either `ID` or `SECRET` respectively.
 * :::
 *
 * `AUTH_SECRET` and `AUTH_URL` are also aliased for `NEXTAUTH_SECRET` and `NEXTAUTH_URL` for consistency.
 *
 * To add social login to your app, the configuration becomes:
 *
 * ```ts title="auth.ts"
 * import NextAuth from "next-auth"
 * import GitHub from "next-auth/providers/github"
 * export const { handlers, auth } = NextAuth({ providers: [ GitHub ] })
 * ```
 *
 * And the `.env.local` file:
 *
 * ```sh title=".env.local"
 * AUTH_GITHUB_ID=...
 * AUTH_GITHUB_SECRET=...
 * AUTH_SECRET=...
 * ```
 *
 * :::tip
 * In production, `AUTH_SECRET` is a required environment variable - if not set, NextAuth.js will throw an error. See [MissingSecretError](https://authjs.dev/reference/core/errors#missingsecret) for more details.
 * :::
 *
 * If you need to override the default values for a provider, you can still call it as a function `GitHub({...})` as before.
 *
 * ## Lazy initialization
 * You can also initialize NextAuth.js lazily (previously known as advanced intialization), which allows you to access the request context in the configuration in some cases, like Route Handlers, Middleware, API Routes or `getServerSideProps`.
 * The above example becomes:
 *
 * ```ts title="auth.ts"
 * import NextAuth from "next-auth"
 * import GitHub from "next-auth/providers/github"
 * export const { handlers, auth } = NextAuth(req => {
 *  if (req) {
 *   console.log(req) // do something with the request
 *  }
 *  return { providers: [ GitHub ] }
 * })
 * ```
 *
 * :::tip
 * This is useful if you want to customize the configuration based on the request, for example, to add a different provider in staging/dev environments.
 * :::
 *
 * @module next-auth
 */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/lib/symbols.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/lib/env.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/lib/index.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/lib/actions.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$errors$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/errors.js [app-route] (ecmascript)");
;
;
;
;
;
;
function NextAuth(config) {
    if (typeof config === "function") {
        const httpHandler = async (req)=>{
            const _config = await config(req);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(_config);
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["reqWithEnvURL"])(req), _config);
        };
        return {
            handlers: {
                GET: httpHandler,
                POST: httpHandler
            },
            // @ts-expect-error
            auth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAuth"])(config, (c)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(c)),
            signIn: async (provider, options, authorizationParams)=>{
                const _config = await config(undefined);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(_config);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signIn"])(provider, options, authorizationParams, _config);
            },
            signOut: async (options)=>{
                const _config = await config(undefined);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(_config);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signOut"])(options, _config);
            },
            unstable_update: async (data)=>{
                const _config = await config(undefined);
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(_config);
                return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["update"])(data, _config);
            }
        };
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(config);
    const httpHandler = (req)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["reqWithEnvURL"])(req), config);
    return {
        handlers: {
            GET: httpHandler,
            POST: httpHandler
        },
        // @ts-expect-error
        auth: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["initAuth"])(config),
        signIn: (provider, options, authorizationParams)=>{
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signIn"])(provider, options, authorizationParams, config);
        },
        signOut: (options)=>{
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["signOut"])(options, config);
        },
        unstable_update: (data)=>{
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$actions$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["update"])(data, config);
        }
    };
}
}),
"[project]/node_modules/next-auth/lib/actions.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "signIn",
    ()=>signIn,
    "signOut",
    ()=>signOut,
    "update",
    ()=>update
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/lib/symbols.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/lib/utils/env.js [app-route] (ecmascript)");
// @ts-expect-error Next.js does not yet correctly use the `package.json#exports` field
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
// @ts-expect-error Next.js does not yet correctly use the `package.json#exports` field
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-route] (ecmascript)");
;
;
;
async function signIn(provider, options = {}, authorizationParams, config) {
    const headers = new Headers(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])());
    const { redirect: shouldRedirect = true, redirectTo, ...rest } = options instanceof FormData ? Object.fromEntries(options) : options;
    const callbackUrl = redirectTo?.toString() ?? headers.get("Referer") ?? "/";
    const signInURL = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createActionURL"])("signin", // @ts-expect-error `x-forwarded-proto` is not nullable, next.js sets it by default
    headers.get("x-forwarded-proto"), headers, process.env, config);
    if (!provider) {
        signInURL.searchParams.append("callbackUrl", callbackUrl);
        if (shouldRedirect) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redirect"])(signInURL.toString());
        return signInURL.toString();
    }
    let url = `${signInURL}/${provider}?${new URLSearchParams(authorizationParams)}`;
    let foundProvider = {};
    for (const providerConfig of config.providers){
        const { options, ...defaults } = typeof providerConfig === "function" ? providerConfig() : providerConfig;
        const id = options?.id ?? defaults.id;
        if (id === provider) {
            foundProvider = {
                id,
                type: options?.type ?? defaults.type
            };
            break;
        }
    }
    if (!foundProvider.id) {
        const url = `${signInURL}?${new URLSearchParams({
            callbackUrl
        })}`;
        if (shouldRedirect) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redirect"])(url);
        return url;
    }
    if (foundProvider.type === "credentials") {
        url = url.replace("signin", "callback");
    }
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    const body = new URLSearchParams({
        ...rest,
        callbackUrl
    });
    const req = new Request(url, {
        method: "POST",
        headers,
        body
    });
    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])(req, {
        ...config,
        raw: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["raw"],
        skipCSRFCheck: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["skipCSRFCheck"]
    });
    const cookieJar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    for (const c of res?.cookies ?? [])cookieJar.set(c.name, c.value, c.options);
    const responseUrl = res instanceof Response ? res.headers.get("Location") : res.redirect;
    // NOTE: if for some unexpected reason the responseUrl is not set,
    // we redirect to the original url
    const redirectUrl = responseUrl ?? url;
    if (shouldRedirect) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redirect"])(redirectUrl);
    return redirectUrl;
}
async function signOut(options, config) {
    const headers = new Headers(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])());
    headers.set("Content-Type", "application/x-www-form-urlencoded");
    const url = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createActionURL"])("signout", // @ts-expect-error `x-forwarded-proto` is not nullable, next.js sets it by default
    headers.get("x-forwarded-proto"), headers, process.env, config);
    const callbackUrl = options?.redirectTo ?? headers.get("Referer") ?? "/";
    const body = new URLSearchParams({
        callbackUrl
    });
    const req = new Request(url, {
        method: "POST",
        headers,
        body
    });
    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])(req, {
        ...config,
        raw: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["raw"],
        skipCSRFCheck: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["skipCSRFCheck"]
    });
    const cookieJar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    for (const c of res?.cookies ?? [])cookieJar.set(c.name, c.value, c.options);
    if (options?.redirect ?? true) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["redirect"])(res.redirect);
    return res;
}
async function update(data, config) {
    const headers = new Headers(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])());
    headers.set("Content-Type", "application/json");
    const url = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createActionURL"])("session", // @ts-expect-error `x-forwarded-proto` is not nullable, next.js sets it by default
    headers.get("x-forwarded-proto"), headers, process.env, config);
    const body = JSON.stringify({
        data
    });
    const req = new Request(url, {
        method: "POST",
        headers,
        body
    });
    const res = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])(req, {
        ...config,
        raw: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["raw"],
        skipCSRFCheck: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$symbols$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["skipCSRFCheck"]
    });
    const cookieJar = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["cookies"])();
    for (const c of res?.cookies ?? [])cookieJar.set(c.name, c.value, c.options);
    return res.body;
}
}),
"[project]/node_modules/next-auth/lib/env.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "reqWithEnvURL",
    ()=>reqWithEnvURL,
    "setEnvDefaults",
    ()=>setEnvDefaults
]);
// @ts-expect-error Next.js does not yet correctly use the `package.json#exports` field
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/lib/utils/env.js [app-route] (ecmascript)");
;
;
function reqWithEnvURL(req) {
    const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
    if (!url) return req;
    const { origin: envOrigin } = new URL(url);
    const { href, origin } = req.nextUrl;
    return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextRequest"](href.replace(origin, envOrigin), req);
}
function setEnvDefaults(config) {
    try {
        config.secret ?? (config.secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET);
        const url = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
        if (!url) return;
        const { pathname } = new URL(url);
        if (pathname === "/") return;
        config.basePath || (config.basePath = pathname);
    } catch  {
    // Catching and swallowing potential URL parsing errors, we'll fall
    // back to `/api/auth` below.
    } finally{
        config.basePath || (config.basePath = "/api/auth");
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["setEnvDefaults"])(process.env, config, true);
    }
}
}),
"[project]/node_modules/next-auth/lib/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "initAuth",
    ()=>initAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/index.js [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@auth/core/lib/utils/env.js [app-route] (ecmascript)");
// @ts-expect-error Next.js does not yet correctly use the `package.json#exports` field
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-route] (ecmascript)");
// @ts-expect-error Next.js does not yet correctly use the `package.json#exports` field
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next-auth/lib/env.js [app-route] (ecmascript)");
;
;
;
;
async function getSession(headers, config) {
    const url = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$lib$2f$utils$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createActionURL"])("session", // @ts-expect-error `x-forwarded-proto` is not nullable, next.js sets it by default
    headers.get("x-forwarded-proto"), headers, process.env, config);
    const request = new Request(url, {
        headers: {
            cookie: headers.get("cookie") ?? ""
        }
    });
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$auth$2f$core$2f$index$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["Auth"])(request, {
        ...config,
        callbacks: {
            ...config.callbacks,
            // Since we are server-side, we don't need to filter out the session data
            // See https://authjs.dev/getting-started/migrating-to-v5#authenticating-server-side
            // TODO: Taint the session data to prevent accidental leakage to the client
            // https://react.dev/reference/react/experimental_taintObjectReference
            async session (...args) {
                const session = // If the user defined a custom session callback, use that instead
                await config.callbacks?.session?.(...args) ?? {
                    ...args[0].session,
                    expires: args[0].session.expires?.toISOString?.() ?? args[0].session.expires
                };
                const user = args[0].user ?? args[0].token;
                return {
                    user,
                    ...session
                };
            }
        }
    });
}
/**
 * Reads the session payload from a `getSession()` response.
 *
 * On any non-OK response (e.g. a `500` returned by `@auth/core` when the
 * provider configuration is invalid), the body is an error object such as
 * `{ message: "There was a problem with the server configuration..." }`.
 * Returning that object as the session would make truthiness checks like
 * `!!auth` pass for everyone, failing open. Treat any non-OK response as
 * "no session" so auth checks fail closed.
 */ async function parseSessionResponse(response) {
    if (!response.ok) return null;
    return await response.json();
}
function isReqWrapper(arg) {
    return typeof arg === "function";
}
function initAuth(config, onLazyLoad // To set the default env vars
) {
    if (typeof config === "function") {
        return async (...args)=>{
            if (!args.length) {
                // React Server Components
                const _headers = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])();
                const _config = await config(undefined); // Review: Should we pass headers() here instead?
                onLazyLoad?.(_config);
                return getSession(_headers, _config).then(parseSessionResponse);
            }
            if (args[0] instanceof Request) {
                // middleware.ts inline
                // export { auth as default } from "auth"
                const req = args[0];
                const ev = args[1];
                const _config = await config(req);
                onLazyLoad?.(_config);
                // args[0] is supposed to be NextRequest but the instanceof check is failing.
                return handleAuth([
                    req,
                    ev
                ], _config);
            }
            if (isReqWrapper(args[0])) {
                // middleware.ts wrapper/route.ts
                // import { auth } from "auth"
                // export default auth((req) => { console.log(req.auth) }})
                const userMiddlewareOrRoute = args[0];
                return async (...args)=>{
                    const _config = await config(args[0]);
                    onLazyLoad?.(_config);
                    return handleAuth(args, _config, userMiddlewareOrRoute);
                };
            }
            // API Routes, getServerSideProps
            const request = "req" in args[0] ? args[0].req : args[0];
            const response = "res" in args[0] ? args[0].res : args[1];
            const _config = await config(request);
            onLazyLoad?.(_config);
            // @ts-expect-error -- request is NextRequest
            return getSession(new Headers(request.headers), _config).then(async (authResponse)=>{
                const auth = await parseSessionResponse(authResponse);
                for (const cookie of authResponse.headers.getSetCookie())if ("headers" in response) response.headers.append("set-cookie", cookie);
                else response.appendHeader("set-cookie", cookie);
                return auth;
            });
        };
    }
    return (...args)=>{
        if (!args.length) {
            // React Server Components
            return Promise.resolve((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["headers"])()).then((h)=>getSession(h, config).then(parseSessionResponse));
        }
        if (args[0] instanceof Request) {
            // middleware.ts inline
            // export { auth as default } from "auth"
            const req = args[0];
            const ev = args[1];
            return handleAuth([
                req,
                ev
            ], config);
        }
        if (isReqWrapper(args[0])) {
            // middleware.ts wrapper/route.ts
            // import { auth } from "auth"
            // export default auth((req) => { console.log(req.auth) }})
            const userMiddlewareOrRoute = args[0];
            return async (...args)=>{
                return handleAuth(args, config, userMiddlewareOrRoute).then((res)=>{
                    return res;
                });
            };
        }
        // API Routes, getServerSideProps
        const request = "req" in args[0] ? args[0].req : args[0];
        const response = "res" in args[0] ? args[0].res : args[1];
        return getSession(// @ts-expect-error
        new Headers(request.headers), config).then(async (authResponse)=>{
            const auth = await parseSessionResponse(authResponse);
            for (const cookie of authResponse.headers.getSetCookie())if ("headers" in response) response.headers.append("set-cookie", cookie);
            else response.appendHeader("set-cookie", cookie);
            return auth;
        });
    };
}
async function handleAuth(args, config, userMiddlewareOrRoute) {
    const request = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2d$auth$2f$lib$2f$env$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["reqWithEnvURL"])(args[0]);
    const sessionResponse = await getSession(request.headers, config);
    const auth = await parseSessionResponse(sessionResponse);
    let authorized = true;
    if (config.callbacks?.authorized) {
        authorized = await config.callbacks.authorized({
            request,
            auth
        });
    }
    let response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].next?.();
    if (authorized instanceof Response) {
        // User returned a custom response, like redirecting to a page or 401, respect it
        response = authorized;
        const redirect = authorized.headers.get("Location");
        const { pathname } = request.nextUrl;
        // If the user is redirecting to the same NextAuth.js action path as the current request,
        // don't allow the redirect to prevent an infinite loop
        if (redirect && isSameAuthAction(pathname, new URL(redirect).pathname, config)) {
            authorized = true;
        }
    } else if (userMiddlewareOrRoute) {
        // Execute user's middleware/handler with the augmented request
        const augmentedReq = request;
        augmentedReq.auth = auth;
        response = await userMiddlewareOrRoute(augmentedReq, args[1]) ?? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].next();
    } else if (!authorized) {
        const signInPage = config.pages?.signIn ?? `${config.basePath}/signin`;
        if (request.nextUrl.pathname !== signInPage) {
            // Redirect to signin page by default if not authorized
            const signInUrl = request.nextUrl.clone();
            signInUrl.pathname = signInPage;
            signInUrl.searchParams.set("callbackUrl", request.nextUrl.href);
            response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].redirect(signInUrl);
        }
    }
    const finalResponse = new Response(response?.body, response);
    // Preserve cookies from the session response
    for (const cookie of sessionResponse.headers.getSetCookie())finalResponse.headers.append("set-cookie", cookie);
    return finalResponse;
}
function isSameAuthAction(requestPath, redirectPath, config) {
    const action = redirectPath.replace(`${requestPath}/`, "");
    const pages = Object.values(config.pages ?? {});
    return (actions.has(action) || pages.includes(redirectPath)) && redirectPath === requestPath;
}
const actions = new Set([
    "providers",
    "session",
    "csrf",
    "signin",
    "signout",
    "callback",
    "verify-request",
    "error"
]);
}),
"[project]/node_modules/next-auth/providers/google.js [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
;
;
}),
"[project]/node_modules/oauth4webapi/build/index.js [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AUTHORIZATION_RESPONSE_ERROR",
    ()=>AUTHORIZATION_RESPONSE_ERROR,
    "AuthorizationResponseError",
    ()=>AuthorizationResponseError,
    "ClientSecretBasic",
    ()=>ClientSecretBasic,
    "ClientSecretJwt",
    ()=>ClientSecretJwt,
    "ClientSecretPost",
    ()=>ClientSecretPost,
    "DPoP",
    ()=>DPoP,
    "HTTP_REQUEST_FORBIDDEN",
    ()=>HTTP_REQUEST_FORBIDDEN,
    "INVALID_REQUEST",
    ()=>INVALID_REQUEST,
    "INVALID_RESPONSE",
    ()=>INVALID_RESPONSE,
    "INVALID_SERVER_METADATA",
    ()=>INVALID_SERVER_METADATA,
    "JSON_ATTRIBUTE_COMPARISON",
    ()=>JSON_ATTRIBUTE_COMPARISON,
    "JWT_CLAIM_COMPARISON",
    ()=>JWT_CLAIM_COMPARISON,
    "JWT_TIMESTAMP_CHECK",
    ()=>JWT_TIMESTAMP_CHECK,
    "JWT_USERINFO_EXPECTED",
    ()=>JWT_USERINFO_EXPECTED,
    "KEY_SELECTION",
    ()=>KEY_SELECTION,
    "MISSING_SERVER_METADATA",
    ()=>MISSING_SERVER_METADATA,
    "None",
    ()=>None,
    "OperationProcessingError",
    ()=>OperationProcessingError,
    "PARSE_ERROR",
    ()=>PARSE_ERROR,
    "PrivateKeyJwt",
    ()=>PrivateKeyJwt,
    "REQUEST_PROTOCOL_FORBIDDEN",
    ()=>REQUEST_PROTOCOL_FORBIDDEN,
    "RESPONSE_BODY_ERROR",
    ()=>RESPONSE_BODY_ERROR,
    "RESPONSE_IS_NOT_CONFORM",
    ()=>RESPONSE_IS_NOT_CONFORM,
    "RESPONSE_IS_NOT_JSON",
    ()=>RESPONSE_IS_NOT_JSON,
    "ResponseBodyError",
    ()=>ResponseBodyError,
    "TlsClientAuth",
    ()=>TlsClientAuth,
    "UNSUPPORTED_OPERATION",
    ()=>UNSUPPORTED_OPERATION,
    "UnsupportedOperationError",
    ()=>UnsupportedOperationError,
    "WWWAuthenticateChallengeError",
    ()=>WWWAuthenticateChallengeError,
    "WWW_AUTHENTICATE_CHALLENGE",
    ()=>WWW_AUTHENTICATE_CHALLENGE,
    "_expectedIssuer",
    ()=>_expectedIssuer,
    "_nodiscoverycheck",
    ()=>_nodiscoverycheck,
    "_nopkce",
    ()=>_nopkce,
    "allowInsecureRequests",
    ()=>allowInsecureRequests,
    "authorizationCodeGrantRequest",
    ()=>authorizationCodeGrantRequest,
    "backchannelAuthenticationGrantRequest",
    ()=>backchannelAuthenticationGrantRequest,
    "backchannelAuthenticationRequest",
    ()=>backchannelAuthenticationRequest,
    "calculatePKCECodeChallenge",
    ()=>calculatePKCECodeChallenge,
    "checkProtocol",
    ()=>checkProtocol,
    "clientCredentialsGrantRequest",
    ()=>clientCredentialsGrantRequest,
    "clockSkew",
    ()=>clockSkew,
    "clockTolerance",
    ()=>clockTolerance,
    "customFetch",
    ()=>customFetch,
    "deviceAuthorizationRequest",
    ()=>deviceAuthorizationRequest,
    "deviceCodeGrantRequest",
    ()=>deviceCodeGrantRequest,
    "discoveryRequest",
    ()=>discoveryRequest,
    "dynamicClientRegistrationRequest",
    ()=>dynamicClientRegistrationRequest,
    "expectNoNonce",
    ()=>expectNoNonce,
    "expectNoState",
    ()=>expectNoState,
    "formPostResponse",
    ()=>formPostResponse,
    "generateKeyPair",
    ()=>generateKeyPair,
    "generateRandomCodeVerifier",
    ()=>generateRandomCodeVerifier,
    "generateRandomNonce",
    ()=>generateRandomNonce,
    "generateRandomState",
    ()=>generateRandomState,
    "genericTokenEndpointRequest",
    ()=>genericTokenEndpointRequest,
    "getContentType",
    ()=>getContentType,
    "getValidatedIdTokenClaims",
    ()=>getValidatedIdTokenClaims,
    "introspectionRequest",
    ()=>introspectionRequest,
    "isDPoPNonceError",
    ()=>isDPoPNonceError,
    "issueRequestObject",
    ()=>issueRequestObject,
    "jweDecrypt",
    ()=>jweDecrypt,
    "jwksCache",
    ()=>jwksCache,
    "modifyAssertion",
    ()=>modifyAssertion,
    "nopkce",
    ()=>nopkce,
    "processAuthorizationCodeResponse",
    ()=>processAuthorizationCodeResponse,
    "processBackchannelAuthenticationGrantResponse",
    ()=>processBackchannelAuthenticationGrantResponse,
    "processBackchannelAuthenticationResponse",
    ()=>processBackchannelAuthenticationResponse,
    "processClientCredentialsResponse",
    ()=>processClientCredentialsResponse,
    "processDeviceAuthorizationResponse",
    ()=>processDeviceAuthorizationResponse,
    "processDeviceCodeResponse",
    ()=>processDeviceCodeResponse,
    "processDiscoveryResponse",
    ()=>processDiscoveryResponse,
    "processDynamicClientRegistrationResponse",
    ()=>processDynamicClientRegistrationResponse,
    "processGenericTokenEndpointResponse",
    ()=>processGenericTokenEndpointResponse,
    "processIntrospectionResponse",
    ()=>processIntrospectionResponse,
    "processPushedAuthorizationResponse",
    ()=>processPushedAuthorizationResponse,
    "processRefreshTokenResponse",
    ()=>processRefreshTokenResponse,
    "processResourceDiscoveryResponse",
    ()=>processResourceDiscoveryResponse,
    "processRevocationResponse",
    ()=>processRevocationResponse,
    "processUserInfoResponse",
    ()=>processUserInfoResponse,
    "protectedResourceRequest",
    ()=>protectedResourceRequest,
    "pushedAuthorizationRequest",
    ()=>pushedAuthorizationRequest,
    "refreshTokenGrantRequest",
    ()=>refreshTokenGrantRequest,
    "resolveEndpoint",
    ()=>resolveEndpoint,
    "resourceDiscoveryRequest",
    ()=>resourceDiscoveryRequest,
    "revocationRequest",
    ()=>revocationRequest,
    "skipAuthTimeCheck",
    ()=>skipAuthTimeCheck,
    "skipStateCheck",
    ()=>skipStateCheck,
    "skipSubjectCheck",
    ()=>skipSubjectCheck,
    "userInfoRequest",
    ()=>userInfoRequest,
    "validateApplicationLevelSignature",
    ()=>validateApplicationLevelSignature,
    "validateAuthResponse",
    ()=>validateAuthResponse,
    "validateCodeIdTokenResponse",
    ()=>validateCodeIdTokenResponse,
    "validateDetachedSignatureResponse",
    ()=>validateDetachedSignatureResponse,
    "validateJwtAccessToken",
    ()=>validateJwtAccessToken,
    "validateJwtAuthResponse",
    ()=>validateJwtAuthResponse
]);
let USER_AGENT;
if (typeof navigator === 'undefined' || !navigator.userAgent?.startsWith?.('Mozilla/5.0 ')) {
    const NAME = 'oauth4webapi';
    const VERSION = 'v3.8.7';
    USER_AGENT = `${NAME}/${VERSION}`;
}
function looseInstanceOf(input, expected) {
    if (input == null) {
        return false;
    }
    try {
        return input instanceof expected || Object.getPrototypeOf(input)[Symbol.toStringTag] === expected.prototype[Symbol.toStringTag];
    } catch  {
        return false;
    }
}
const ERR_INVALID_ARG_VALUE = 'ERR_INVALID_ARG_VALUE';
const ERR_INVALID_ARG_TYPE = 'ERR_INVALID_ARG_TYPE';
function CodedTypeError(message, code, cause) {
    const err = new TypeError(message, {
        cause
    });
    Object.assign(err, {
        code
    });
    return err;
}
const allowInsecureRequests = Symbol();
const clockSkew = Symbol();
const clockTolerance = Symbol();
const customFetch = Symbol();
const modifyAssertion = Symbol();
const jweDecrypt = Symbol();
const jwksCache = Symbol();
const encoder = new TextEncoder();
const decoder = new TextDecoder();
function buf(input) {
    if (typeof input === 'string') {
        return encoder.encode(input);
    }
    return decoder.decode(input);
}
let encodeBase64Url;
if (Uint8Array.prototype.toBase64) {
    encodeBase64Url = (input)=>{
        if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        return input.toBase64({
            alphabet: 'base64url',
            omitPadding: true
        });
    };
} else {
    const CHUNK_SIZE = 0x8000;
    encodeBase64Url = (input)=>{
        if (input instanceof ArrayBuffer) {
            input = new Uint8Array(input);
        }
        const arr = [];
        for(let i = 0; i < input.byteLength; i += CHUNK_SIZE){
            arr.push(String.fromCharCode.apply(null, input.subarray(i, i + CHUNK_SIZE)));
        }
        return btoa(arr.join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    };
}
let decodeBase64Url;
if (Uint8Array.fromBase64) {
    decodeBase64Url = (input)=>{
        try {
            return Uint8Array.fromBase64(input, {
                alphabet: 'base64url'
            });
        } catch (cause) {
            throw CodedTypeError('The input to be decoded is not correctly encoded.', ERR_INVALID_ARG_VALUE, cause);
        }
    };
} else {
    decodeBase64Url = (input)=>{
        try {
            const binary = atob(input.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''));
            const bytes = new Uint8Array(binary.length);
            for(let i = 0; i < binary.length; i++){
                bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
        } catch (cause) {
            throw CodedTypeError('The input to be decoded is not correctly encoded.', ERR_INVALID_ARG_VALUE, cause);
        }
    };
}
function b64u(input) {
    if (typeof input === 'string') {
        return decodeBase64Url(input);
    }
    return encodeBase64Url(input);
}
class UnsupportedOperationError extends Error {
    code;
    constructor(message, options){
        super(message, options);
        this.name = this.constructor.name;
        this.code = UNSUPPORTED_OPERATION;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class OperationProcessingError extends Error {
    code;
    constructor(message, options){
        super(message, options);
        this.name = this.constructor.name;
        if (options?.code) {
            this.code = options?.code;
        }
        Error.captureStackTrace?.(this, this.constructor);
    }
}
function OPE(message, code, cause) {
    return new OperationProcessingError(message, {
        code,
        cause
    });
}
async function calculateJwkThumbprint(jwk) {
    let components;
    switch(jwk.kty){
        case 'EC':
            components = {
                crv: jwk.crv,
                kty: jwk.kty,
                x: jwk.x,
                y: jwk.y
            };
            break;
        case 'OKP':
            components = {
                crv: jwk.crv,
                kty: jwk.kty,
                x: jwk.x
            };
            break;
        case 'AKP':
            components = {
                alg: jwk.alg,
                kty: jwk.kty,
                pub: jwk.pub
            };
            break;
        case 'RSA':
            components = {
                e: jwk.e,
                kty: jwk.kty,
                n: jwk.n
            };
            break;
        default:
            throw new UnsupportedOperationError('unsupported JWK key type', {
                cause: jwk
            });
    }
    return b64u(await crypto.subtle.digest('SHA-256', buf(JSON.stringify(components))));
}
function assertCryptoKey(key, it) {
    if (!(key instanceof CryptoKey)) {
        throw CodedTypeError(`${it} must be a CryptoKey`, ERR_INVALID_ARG_TYPE);
    }
}
function assertPrivateKey(key, it) {
    assertCryptoKey(key, it);
    if (key.type !== 'private') {
        throw CodedTypeError(`${it} must be a private CryptoKey`, ERR_INVALID_ARG_VALUE);
    }
}
function assertPublicKey(key, it) {
    assertCryptoKey(key, it);
    if (key.type !== 'public') {
        throw CodedTypeError(`${it} must be a public CryptoKey`, ERR_INVALID_ARG_VALUE);
    }
}
function normalizeTyp(value) {
    return value.toLowerCase().replace(/^application\//, '');
}
function isJsonObject(input) {
    if (input === null || typeof input !== 'object' || Array.isArray(input)) {
        return false;
    }
    return true;
}
function prepareHeaders(input) {
    if (looseInstanceOf(input, Headers)) {
        input = Object.fromEntries(input.entries());
    }
    const headers = new Headers(input ?? {});
    if (USER_AGENT && !headers.has('user-agent')) {
        headers.set('user-agent', USER_AGENT);
    }
    if (headers.has('authorization')) {
        throw CodedTypeError('"options.headers" must not include the "authorization" header name', ERR_INVALID_ARG_VALUE);
    }
    return headers;
}
function signal(url, value) {
    if (value !== undefined) {
        if (typeof value === 'function') {
            value = value(url.href);
        }
        if (!(value instanceof AbortSignal)) {
            throw CodedTypeError('"options.signal" must return or be an instance of AbortSignal', ERR_INVALID_ARG_TYPE);
        }
        return value;
    }
    return undefined;
}
function replaceDoubleSlash(pathname) {
    if (pathname.includes('//')) {
        return pathname.replace('//', '/');
    }
    return pathname;
}
function prependWellKnown(url, wellKnown, allowTerminatingSlash = false) {
    if (url.pathname === '/') {
        url.pathname = wellKnown;
    } else {
        url.pathname = replaceDoubleSlash(`${wellKnown}/${allowTerminatingSlash ? url.pathname : url.pathname.replace(/(\/)$/, '')}`);
    }
    return url;
}
function appendWellKnown(url, wellKnown) {
    url.pathname = replaceDoubleSlash(`${url.pathname}/${wellKnown}`);
    return url;
}
async function performDiscovery(input, urlName, transform, options) {
    if (!(input instanceof URL)) {
        throw CodedTypeError(`"${urlName}" must be an instance of URL`, ERR_INVALID_ARG_TYPE);
    }
    checkProtocol(input, options?.[allowInsecureRequests] !== true);
    const url = transform(new URL(input.href));
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return (options?.[customFetch] || fetch)(url.href, {
        body: undefined,
        headers: Object.fromEntries(headers.entries()),
        method: 'GET',
        redirect: 'manual',
        signal: signal(url, options?.signal)
    });
}
async function discoveryRequest(issuerIdentifier, options) {
    return performDiscovery(issuerIdentifier, 'issuerIdentifier', (url)=>{
        switch(options?.algorithm){
            case undefined:
            case 'oidc':
                appendWellKnown(url, '.well-known/openid-configuration');
                break;
            case 'oauth2':
                prependWellKnown(url, '.well-known/oauth-authorization-server');
                break;
            default:
                throw CodedTypeError('"options.algorithm" must be "oidc" (default), or "oauth2"', ERR_INVALID_ARG_VALUE);
        }
        return url;
    }, options);
}
function assertNumber(input, allow0, it, code, cause) {
    try {
        if (typeof input !== 'number' || !Number.isFinite(input)) {
            throw CodedTypeError(`${it} must be a number`, ERR_INVALID_ARG_TYPE, cause);
        }
        if (input > 0) return;
        if (allow0) {
            if (input !== 0) {
                throw CodedTypeError(`${it} must be a non-negative number`, ERR_INVALID_ARG_VALUE, cause);
            }
            return;
        }
        throw CodedTypeError(`${it} must be a positive number`, ERR_INVALID_ARG_VALUE, cause);
    } catch (err) {
        if (code) {
            throw OPE(err.message, code, cause);
        }
        throw err;
    }
}
function assertString(input, it, code, cause) {
    try {
        if (typeof input !== 'string') {
            throw CodedTypeError(`${it} must be a string`, ERR_INVALID_ARG_TYPE, cause);
        }
        if (input.length === 0) {
            throw CodedTypeError(`${it} must not be empty`, ERR_INVALID_ARG_VALUE, cause);
        }
    } catch (err) {
        if (code) {
            throw OPE(err.message, code, cause);
        }
        throw err;
    }
}
async function processDiscoveryResponse(expectedIssuerIdentifier, response) {
    const expected = expectedIssuerIdentifier;
    if (!(expected instanceof URL) && expected !== _nodiscoverycheck) {
        throw CodedTypeError('"expectedIssuerIdentifier" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform Authorization Server Metadata response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.issuer, '"response" body "issuer" property', INVALID_RESPONSE, {
        body: json
    });
    if (expected !== _nodiscoverycheck && new URL(json.issuer).href !== expected.href) {
        throw OPE('"response" body "issuer" property does not match the expected value', JSON_ATTRIBUTE_COMPARISON, {
            expected: expected.href,
            body: json,
            attribute: 'issuer'
        });
    }
    return json;
}
function assertApplicationJson(response) {
    assertContentType(response, 'application/json');
}
function notJson(response, ...types) {
    let msg = '"response" content-type must be ';
    if (types.length > 2) {
        const last = types.pop();
        msg += `${types.join(', ')}, or ${last}`;
    } else if (types.length === 2) {
        msg += `${types[0]} or ${types[1]}`;
    } else {
        msg += types[0];
    }
    return OPE(msg, RESPONSE_IS_NOT_JSON, response);
}
function assertContentTypes(response, ...types) {
    if (!types.includes(getContentType(response))) {
        throw notJson(response, ...types);
    }
}
function assertContentType(response, contentType) {
    if (getContentType(response) !== contentType) {
        throw notJson(response, contentType);
    }
}
function randomBytes() {
    return b64u(crypto.getRandomValues(new Uint8Array(32)));
}
function generateRandomCodeVerifier() {
    return randomBytes();
}
function generateRandomState() {
    return randomBytes();
}
function generateRandomNonce() {
    return randomBytes();
}
async function calculatePKCECodeChallenge(codeVerifier) {
    assertString(codeVerifier, 'codeVerifier');
    return b64u(await crypto.subtle.digest('SHA-256', buf(codeVerifier)));
}
function getKeyAndKid(input) {
    if (input instanceof CryptoKey) {
        return {
            key: input
        };
    }
    if (!(input?.key instanceof CryptoKey)) {
        return {};
    }
    if (input.kid !== undefined) {
        assertString(input.kid, '"kid"');
    }
    return {
        key: input.key,
        kid: input.kid
    };
}
function psAlg(key) {
    switch(key.algorithm.hash.name){
        case 'SHA-256':
            return 'PS256';
        case 'SHA-384':
            return 'PS384';
        case 'SHA-512':
            return 'PS512';
        default:
            throw new UnsupportedOperationError('unsupported RsaHashedKeyAlgorithm hash name', {
                cause: key
            });
    }
}
function rsAlg(key) {
    switch(key.algorithm.hash.name){
        case 'SHA-256':
            return 'RS256';
        case 'SHA-384':
            return 'RS384';
        case 'SHA-512':
            return 'RS512';
        default:
            throw new UnsupportedOperationError('unsupported RsaHashedKeyAlgorithm hash name', {
                cause: key
            });
    }
}
function esAlg(key) {
    switch(key.algorithm.namedCurve){
        case 'P-256':
            return 'ES256';
        case 'P-384':
            return 'ES384';
        case 'P-521':
            return 'ES512';
        default:
            throw new UnsupportedOperationError('unsupported EcKeyAlgorithm namedCurve', {
                cause: key
            });
    }
}
function keyToJws(key) {
    switch(key.algorithm.name){
        case 'RSA-PSS':
            return psAlg(key);
        case 'RSASSA-PKCS1-v1_5':
            return rsAlg(key);
        case 'ECDSA':
            return esAlg(key);
        case 'Ed25519':
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
            return key.algorithm.name;
        case 'EdDSA':
            return 'Ed25519';
        default:
            throw new UnsupportedOperationError('unsupported CryptoKey algorithm name', {
                cause: key
            });
    }
}
function getClockSkew(client) {
    const skew = client?.[clockSkew];
    return typeof skew === 'number' && Number.isFinite(skew) ? skew : 0;
}
function getClockTolerance(client) {
    const tolerance = client?.[clockTolerance];
    return typeof tolerance === 'number' && Number.isFinite(tolerance) && Math.sign(tolerance) !== -1 ? tolerance : 30;
}
function epochTime() {
    return Math.floor(Date.now() / 1000);
}
function assertAs(as) {
    if (typeof as !== 'object' || as === null) {
        throw CodedTypeError('"as" must be an object', ERR_INVALID_ARG_TYPE);
    }
    assertString(as.issuer, '"as.issuer"');
}
function assertClient(client) {
    if (typeof client !== 'object' || client === null) {
        throw CodedTypeError('"client" must be an object', ERR_INVALID_ARG_TYPE);
    }
    assertString(client.client_id, '"client.client_id"');
}
function formUrlEncode(token) {
    return encodeURIComponent(token).replace(/(?:[-_.!~*'()]|%20)/g, (substring)=>{
        switch(substring){
            case '-':
            case '_':
            case '.':
            case '!':
            case '~':
            case '*':
            case "'":
            case '(':
            case ')':
                return `%${substring.charCodeAt(0).toString(16).toUpperCase()}`;
            case '%20':
                return '+';
            default:
                throw new Error();
        }
    });
}
function ClientSecretPost(clientSecret) {
    assertString(clientSecret, '"clientSecret"');
    return (_as, client, body, _headers)=>{
        body.set('client_id', client.client_id);
        body.set('client_secret', clientSecret);
    };
}
function ClientSecretBasic(clientSecret) {
    assertString(clientSecret, '"clientSecret"');
    return (_as, client, _body, headers)=>{
        const username = formUrlEncode(client.client_id);
        const password = formUrlEncode(clientSecret);
        const credentials = btoa(`${username}:${password}`);
        headers.set('authorization', `Basic ${credentials}`);
    };
}
function clientAssertionPayload(as, client) {
    const now = epochTime() + getClockSkew(client);
    return {
        jti: randomBytes(),
        aud: as.issuer,
        exp: now + 60,
        iat: now,
        nbf: now,
        iss: client.client_id,
        sub: client.client_id
    };
}
function PrivateKeyJwt(clientPrivateKey, options) {
    const { key, kid } = getKeyAndKid(clientPrivateKey);
    assertPrivateKey(key, '"clientPrivateKey.key"');
    return async (as, client, body, _headers)=>{
        const header = {
            alg: keyToJws(key),
            kid
        };
        const payload = clientAssertionPayload(as, client);
        options?.[modifyAssertion]?.(header, payload);
        body.set('client_id', client.client_id);
        body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        body.set('client_assertion', await signJwt(header, payload, key));
    };
}
function ClientSecretJwt(clientSecret, options) {
    assertString(clientSecret, '"clientSecret"');
    const modify = options?.[modifyAssertion];
    let key;
    return async (as, client, body, _headers)=>{
        key ||= await crypto.subtle.importKey('raw', buf(clientSecret), {
            hash: 'SHA-256',
            name: 'HMAC'
        }, false, [
            'sign'
        ]);
        const header = {
            alg: 'HS256'
        };
        const payload = clientAssertionPayload(as, client);
        modify?.(header, payload);
        const data = `${b64u(buf(JSON.stringify(header)))}.${b64u(buf(JSON.stringify(payload)))}`;
        const hmac = await crypto.subtle.sign(key.algorithm, key, buf(data));
        body.set('client_id', client.client_id);
        body.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
        body.set('client_assertion', `${data}.${b64u(new Uint8Array(hmac))}`);
    };
}
function None() {
    return (_as, client, body, _headers)=>{
        body.set('client_id', client.client_id);
    };
}
function TlsClientAuth() {
    return None();
}
async function signJwt(header, payload, key) {
    if (!key.usages.includes('sign')) {
        throw CodedTypeError('CryptoKey instances used for signing assertions must include "sign" in their "usages"', ERR_INVALID_ARG_VALUE);
    }
    const input = `${b64u(buf(JSON.stringify(header)))}.${b64u(buf(JSON.stringify(payload)))}`;
    const signature = b64u(await crypto.subtle.sign(keyToSubtle(key), key, buf(input)));
    return `${input}.${signature}`;
}
async function issueRequestObject(as, client, parameters, privateKey, options) {
    assertAs(as);
    assertClient(client);
    parameters = new URLSearchParams(parameters);
    const { key, kid } = getKeyAndKid(privateKey);
    assertPrivateKey(key, '"privateKey.key"');
    parameters.set('client_id', client.client_id);
    const now = epochTime() + getClockSkew(client);
    const claims = {
        ...Object.fromEntries(parameters.entries()),
        jti: randomBytes(),
        aud: as.issuer,
        exp: now + 60,
        iat: now,
        nbf: now,
        iss: client.client_id
    };
    let resource;
    if (parameters.has('resource') && (resource = parameters.getAll('resource')) && resource.length > 1) {
        claims.resource = resource;
    }
    {
        let value = parameters.get('max_age');
        if (value !== null) {
            claims.max_age = parseInt(value, 10);
            assertNumber(claims.max_age, true, '"max_age" parameter');
        }
    }
    {
        let value = parameters.get('claims');
        if (value !== null) {
            try {
                claims.claims = JSON.parse(value);
            } catch (cause) {
                throw OPE('failed to parse the "claims" parameter as JSON', PARSE_ERROR, cause);
            }
            if (!isJsonObject(claims.claims)) {
                throw CodedTypeError('"claims" parameter must be a JSON with a top level object', ERR_INVALID_ARG_VALUE);
            }
        }
    }
    {
        let value = parameters.get('authorization_details');
        if (value !== null) {
            try {
                claims.authorization_details = JSON.parse(value);
            } catch (cause) {
                throw OPE('failed to parse the "authorization_details" parameter as JSON', PARSE_ERROR, cause);
            }
            if (!Array.isArray(claims.authorization_details)) {
                throw CodedTypeError('"authorization_details" parameter must be a JSON with a top level array', ERR_INVALID_ARG_VALUE);
            }
        }
    }
    const header = {
        alg: keyToJws(key),
        typ: 'oauth-authz-req+jwt',
        kid
    };
    options?.[modifyAssertion]?.(header, claims);
    return signJwt(header, claims, key);
}
let jwkCache;
async function getSetPublicJwkCache(key, alg) {
    const { kty, e, n, x, y, crv, pub } = await crypto.subtle.exportKey('jwk', key);
    const jwk = {
        kty,
        e,
        n,
        x,
        y,
        crv,
        pub
    };
    if (kty === 'AKP') jwk.alg = alg;
    jwkCache.set(key, jwk);
    return jwk;
}
async function publicJwk(key, alg) {
    jwkCache ||= new WeakMap();
    return jwkCache.get(key) || getSetPublicJwkCache(key, alg);
}
const URLParse = URL.parse ? (url, base)=>URL.parse(url, base) : (url, base)=>{
    try {
        return new URL(url, base);
    } catch  {
        return null;
    }
};
function checkProtocol(url, enforceHttps) {
    if (enforceHttps && url.protocol !== 'https:') {
        throw OPE('only requests to HTTPS are allowed', HTTP_REQUEST_FORBIDDEN, url);
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        throw OPE('only HTTP and HTTPS requests are allowed', REQUEST_PROTOCOL_FORBIDDEN, url);
    }
}
function validateEndpoint(value, endpoint, useMtlsAlias, enforceHttps) {
    let url;
    if (typeof value !== 'string' || !(url = URLParse(value))) {
        throw OPE(`authorization server metadata does not contain a valid ${useMtlsAlias ? `"as.mtls_endpoint_aliases.${endpoint}"` : `"as.${endpoint}"`}`, value === undefined ? MISSING_SERVER_METADATA : INVALID_SERVER_METADATA, {
            attribute: useMtlsAlias ? `mtls_endpoint_aliases.${endpoint}` : endpoint
        });
    }
    checkProtocol(url, enforceHttps);
    return url;
}
function resolveEndpoint(as, endpoint, useMtlsAlias, enforceHttps) {
    if (useMtlsAlias && as.mtls_endpoint_aliases && endpoint in as.mtls_endpoint_aliases) {
        return validateEndpoint(as.mtls_endpoint_aliases[endpoint], endpoint, useMtlsAlias, enforceHttps);
    }
    return validateEndpoint(as[endpoint], endpoint, useMtlsAlias, enforceHttps);
}
async function pushedAuthorizationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'pushed_authorization_request_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    if (options?.DPoP !== undefined) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, 'POST');
    }
    const response = await authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
    options?.DPoP?.cacheNonce(response, url);
    return response;
}
class DPoPHandler {
    #header;
    #privateKey;
    #publicKey;
    #clockSkew;
    #modifyAssertion;
    #map;
    #jkt;
    constructor(client, keyPair, options){
        assertPrivateKey(keyPair?.privateKey, '"DPoP.privateKey"');
        assertPublicKey(keyPair?.publicKey, '"DPoP.publicKey"');
        if (!keyPair.publicKey.extractable) {
            throw CodedTypeError('"DPoP.publicKey.extractable" must be true', ERR_INVALID_ARG_VALUE);
        }
        this.#modifyAssertion = options?.[modifyAssertion];
        this.#clockSkew = getClockSkew(client);
        this.#privateKey = keyPair.privateKey;
        this.#publicKey = keyPair.publicKey;
        branded.add(this);
    }
    #get(key) {
        this.#map ||= new Map();
        let item = this.#map.get(key);
        if (item) {
            this.#map.delete(key);
            this.#map.set(key, item);
        }
        return item;
    }
    #set(key, val) {
        this.#map ||= new Map();
        this.#map.delete(key);
        if (this.#map.size === 100) {
            this.#map.delete(this.#map.keys().next().value);
        }
        this.#map.set(key, val);
    }
    async calculateThumbprint() {
        if (!this.#jkt) {
            const jwk = await crypto.subtle.exportKey('jwk', this.#publicKey);
            this.#jkt ||= await calculateJwkThumbprint(jwk);
        }
        return this.#jkt;
    }
    async addProof(url, headers, htm, accessToken) {
        const alg = keyToJws(this.#privateKey);
        this.#header ||= {
            alg,
            typ: 'dpop+jwt',
            jwk: await publicJwk(this.#publicKey, alg)
        };
        const nonce = this.#get(url.origin);
        const now = epochTime() + this.#clockSkew;
        const payload = {
            iat: now,
            jti: randomBytes(),
            htm,
            nonce,
            htu: `${url.origin}${url.pathname}`,
            ath: accessToken ? b64u(await crypto.subtle.digest('SHA-256', buf(accessToken))) : undefined
        };
        this.#modifyAssertion?.(this.#header, payload);
        headers.set('dpop', await signJwt(this.#header, payload, this.#privateKey));
    }
    cacheNonce(response, url) {
        try {
            const nonce = response.headers.get('dpop-nonce');
            if (nonce) {
                this.#set(url.origin, nonce);
            }
        } catch  {}
    }
}
function isDPoPNonceError(err) {
    if (err instanceof WWWAuthenticateChallengeError) {
        const { 0: challenge, length } = err.cause;
        return length === 1 && challenge.scheme === 'dpop' && challenge.parameters.error === 'use_dpop_nonce';
    }
    if (err instanceof ResponseBodyError) {
        return err.error === 'use_dpop_nonce';
    }
    return false;
}
function DPoP(client, keyPair, options) {
    return new DPoPHandler(client, keyPair, options);
}
class ResponseBodyError extends Error {
    cause;
    code;
    error;
    status;
    error_description;
    response;
    constructor(message, options){
        super(message, options);
        this.name = this.constructor.name;
        this.code = RESPONSE_BODY_ERROR;
        this.cause = options.cause;
        this.error = options.cause.error;
        this.status = options.response.status;
        this.error_description = options.cause.error_description;
        Object.defineProperty(this, 'response', {
            enumerable: false,
            value: options.response
        });
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class AuthorizationResponseError extends Error {
    cause;
    code;
    error;
    error_description;
    constructor(message, options){
        super(message, options);
        this.name = this.constructor.name;
        this.code = AUTHORIZATION_RESPONSE_ERROR;
        this.cause = options.cause;
        this.error = options.cause.get('error');
        this.error_description = options.cause.get('error_description') ?? undefined;
        Error.captureStackTrace?.(this, this.constructor);
    }
}
class WWWAuthenticateChallengeError extends Error {
    cause;
    code;
    response;
    status;
    constructor(message, options){
        super(message, options);
        this.name = this.constructor.name;
        this.code = WWW_AUTHENTICATE_CHALLENGE;
        this.cause = options.cause;
        this.status = options.response.status;
        this.response = options.response;
        Object.defineProperty(this, 'response', {
            enumerable: false
        });
        Error.captureStackTrace?.(this, this.constructor);
    }
}
const tokenMatch = "[a-zA-Z0-9!#$%&\\'\\*\\+\\-\\.\\^_`\\|~]+";
const token68Match = '[a-zA-Z0-9\\-\\._\\~\\+\\/]+={0,2}';
const quotedMatch = '"((?:[^"\\\\]|\\\\[\\s\\S])*)"';
const quotedParamMatcher = '(' + tokenMatch + ')\\s*=\\s*' + quotedMatch;
const paramMatcher = '(' + tokenMatch + ')\\s*=\\s*(' + tokenMatch + ')';
const schemeRE = new RegExp('^[,\\s]*(' + tokenMatch + ')');
const quotedParamRE = new RegExp('^[,\\s]*' + quotedParamMatcher + '[,\\s]*(.*)');
const unquotedParamRE = new RegExp('^[,\\s]*' + paramMatcher + '[,\\s]*(.*)');
const token68ParamRE = new RegExp('^(' + token68Match + ')(?:$|[,\\s])(.*)');
function parseWwwAuthenticateChallenges(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    const header = response.headers.get('www-authenticate');
    if (header === null) {
        return undefined;
    }
    const challenges = [];
    let rest = header;
    while(rest){
        let match = rest.match(schemeRE);
        const scheme = match?.['1'].toLowerCase();
        if (!scheme) {
            return undefined;
        }
        const afterScheme = rest.substring(match[0].length);
        if (afterScheme && !afterScheme.match(/^[\s,]/)) {
            return undefined;
        }
        const spaceMatch = afterScheme.match(/^\s+(.*)$/);
        const hasParameters = !!spaceMatch;
        rest = spaceMatch ? spaceMatch[1] : undefined;
        const parameters = {};
        let token68;
        if (hasParameters) {
            while(rest){
                let key;
                let value;
                if (match = rest.match(quotedParamRE)) {
                    ;
                    [, key, value, rest] = match;
                    if (value.includes('\\')) {
                        try {
                            value = JSON.parse(`"${value}"`);
                        } catch  {}
                    }
                    parameters[key.toLowerCase()] = value;
                    continue;
                }
                if (match = rest.match(unquotedParamRE)) {
                    ;
                    [, key, value, rest] = match;
                    parameters[key.toLowerCase()] = value;
                    continue;
                }
                if (match = rest.match(token68ParamRE)) {
                    if (Object.keys(parameters).length) {
                        break;
                    }
                    ;
                    [, token68, rest] = match;
                    break;
                }
                return undefined;
            }
        } else {
            rest = afterScheme || undefined;
        }
        const challenge = {
            scheme,
            parameters
        };
        if (token68) {
            challenge.token68 = token68;
        }
        challenges.push(challenge);
    }
    if (!challenges.length) {
        return undefined;
    }
    return challenges;
}
async function processPushedAuthorizationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 201, 'Pushed Authorization Request Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.request_uri, '"response" body "request_uri" property', INVALID_RESPONSE, {
        body: json
    });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json
    });
    json.expires_in = expiresIn;
    return json;
}
async function parseOAuthResponseErrorBody(response) {
    if (response.status > 399 && response.status < 500) {
        assertReadableResponse(response);
        assertApplicationJson(response);
        try {
            const json = await response.clone().json();
            if (isJsonObject(json) && typeof json.error === 'string' && json.error.length) {
                return json;
            }
        } catch  {}
    }
    return undefined;
}
async function checkOAuthBodyError(response, expected, label) {
    if (response.status !== expected) {
        checkAuthenticationChallenges(response);
        let err;
        if (err = await parseOAuthResponseErrorBody(response)) {
            await response.body?.cancel();
            throw new ResponseBodyError('server responded with an error in the response body', {
                cause: err,
                response
            });
        }
        throw OPE(`"response" is not a conform ${label} response (unexpected HTTP status code)`, RESPONSE_IS_NOT_CONFORM, response);
    }
}
function assertDPoP(option) {
    if (!branded.has(option)) {
        throw CodedTypeError('"options.DPoP" is not a valid DPoPHandle', ERR_INVALID_ARG_VALUE);
    }
}
async function resourceRequest(accessToken, method, url, headers, body, options) {
    assertString(accessToken, '"accessToken"');
    if (!(url instanceof URL)) {
        throw CodedTypeError('"url" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    checkProtocol(url, options?.[allowInsecureRequests] !== true);
    headers = prepareHeaders(headers);
    if (options?.DPoP) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, method.toUpperCase(), accessToken);
    }
    headers.set('authorization', `${headers.has('dpop') ? 'DPoP' : 'Bearer'} ${accessToken}`);
    const response = await (options?.[customFetch] || fetch)(url.href, {
        duplex: looseInstanceOf(body, ReadableStream) ? 'half' : undefined,
        body,
        headers: Object.fromEntries(headers.entries()),
        method,
        redirect: 'manual',
        signal: signal(url, options?.signal)
    });
    options?.DPoP?.cacheNonce(response, url);
    return response;
}
async function protectedResourceRequest(accessToken, method, url, headers, body, options) {
    const response = await resourceRequest(accessToken, method, url, headers, body, options);
    checkAuthenticationChallenges(response);
    return response;
}
async function userInfoRequest(as, client, accessToken, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'userinfo_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    if (client.userinfo_signed_response_alg) {
        headers.set('accept', 'application/jwt');
    } else {
        headers.set('accept', 'application/json');
        headers.append('accept', 'application/jwt');
    }
    return resourceRequest(accessToken, 'GET', url, headers, null, {
        ...options,
        [clockSkew]: getClockSkew(client)
    });
}
let jwksMap;
function setJwksCache(as, jwks, uat, cache) {
    jwksMap ||= new WeakMap();
    jwksMap.set(as, {
        jwks,
        uat,
        get age () {
            return epochTime() - this.uat;
        }
    });
    if (cache) {
        Object.assign(cache, {
            jwks: structuredClone(jwks),
            uat
        });
    }
}
function isFreshJwksCache(input) {
    if (typeof input !== 'object' || input === null) {
        return false;
    }
    if (!('uat' in input) || typeof input.uat !== 'number' || epochTime() - input.uat >= 300) {
        return false;
    }
    if (!('jwks' in input) || !isJsonObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isJsonObject)) {
        return false;
    }
    return true;
}
function clearJwksCache(as, cache) {
    jwksMap?.delete(as);
    delete cache?.jwks;
    delete cache?.uat;
}
async function getPublicSigKeyFromIssuerJwksUri(as, options, header) {
    const { alg, kid } = header;
    checkSupportedJwsAlg(header);
    if (!jwksMap?.has(as) && isFreshJwksCache(options?.[jwksCache])) {
        setJwksCache(as, options?.[jwksCache].jwks, options?.[jwksCache].uat);
    }
    let jwks;
    let age;
    if (jwksMap?.has(as)) {
        ;
        ({ jwks, age } = jwksMap.get(as));
        if (age >= 300) {
            clearJwksCache(as, options?.[jwksCache]);
            return getPublicSigKeyFromIssuerJwksUri(as, options, header);
        }
    } else {
        jwks = await jwksRequest(as, options).then(processJwksResponse);
        age = 0;
        setJwksCache(as, jwks, epochTime(), options?.[jwksCache]);
    }
    let kty;
    switch(alg.slice(0, 2)){
        case 'RS':
        case 'PS':
            kty = 'RSA';
            break;
        case 'ES':
            kty = 'EC';
            break;
        case 'Ed':
            kty = 'OKP';
            break;
        case 'ML':
            kty = 'AKP';
            break;
        default:
            throw new UnsupportedOperationError('unsupported JWS algorithm', {
                cause: {
                    alg
                }
            });
    }
    const candidates = jwks.keys.filter((jwk)=>{
        if (jwk.kty !== kty) {
            return false;
        }
        if (kid !== undefined && kid !== jwk.kid) {
            return false;
        }
        if (jwk.alg !== undefined && alg !== jwk.alg) {
            return false;
        }
        if (jwk.use !== undefined && jwk.use !== 'sig') {
            return false;
        }
        if (jwk.key_ops?.includes('verify') === false) {
            return false;
        }
        switch(true){
            case alg === 'ES256' && jwk.crv !== 'P-256':
            case alg === 'ES384' && jwk.crv !== 'P-384':
            case alg === 'ES512' && jwk.crv !== 'P-521':
            case alg === 'Ed25519' && jwk.crv !== 'Ed25519':
            case alg === 'EdDSA' && jwk.crv !== 'Ed25519':
                return false;
        }
        return true;
    });
    const { 0: jwk, length } = candidates;
    if (!length) {
        if (age >= 60) {
            clearJwksCache(as, options?.[jwksCache]);
            return getPublicSigKeyFromIssuerJwksUri(as, options, header);
        }
        throw OPE('error when selecting a JWT verification key, no applicable keys found', KEY_SELECTION, {
            header,
            candidates,
            jwks_uri: new URL(as.jwks_uri)
        });
    }
    if (length !== 1) {
        throw OPE('error when selecting a JWT verification key, multiple applicable keys found, a "kid" JWT Header Parameter is required', KEY_SELECTION, {
            header,
            candidates,
            jwks_uri: new URL(as.jwks_uri)
        });
    }
    return importJwk(alg, jwk);
}
const skipSubjectCheck = Symbol();
function getContentType(input) {
    return input.headers.get('content-type')?.split(';')[0];
}
async function processUserInfoResponse(as, client, expectedSubject, response, options) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    checkAuthenticationChallenges(response);
    if (response.status !== 200) {
        throw OPE('"response" is not a conform UserInfo Endpoint response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    let json;
    if (getContentType(response) === 'application/jwt') {
        const { claims, jwt } = await validateJwt(await response.text(), checkSigningAlgorithm.bind(undefined, client.userinfo_signed_response_alg, as.userinfo_signing_alg_values_supported, undefined), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt]).then(validateOptionalAudience.bind(undefined, client.client_id)).then(validateOptionalIssuer.bind(undefined, as));
        jwtRefs.set(response, jwt);
        json = claims;
    } else {
        if (client.userinfo_signed_response_alg) {
            throw OPE('JWT UserInfo Response expected', JWT_USERINFO_EXPECTED, response);
        }
        json = await getResponseJsonBody(response);
    }
    assertString(json.sub, '"response" body "sub" property', INVALID_RESPONSE, {
        body: json
    });
    switch(expectedSubject){
        case skipSubjectCheck:
            break;
        default:
            assertString(expectedSubject, '"expectedSubject"');
            if (json.sub !== expectedSubject) {
                throw OPE('unexpected "response" body "sub" property value', JSON_ATTRIBUTE_COMPARISON, {
                    expected: expectedSubject,
                    body: json,
                    attribute: 'sub'
                });
            }
    }
    return json;
}
async function authenticatedRequest(as, client, clientAuthentication, url, body, headers, options) {
    await clientAuthentication(as, client, body, headers);
    headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
    return (options?.[customFetch] || fetch)(url.href, {
        body,
        headers: Object.fromEntries(headers.entries()),
        method: 'POST',
        redirect: 'manual',
        signal: signal(url, options?.signal)
    });
}
async function tokenEndpointRequest(as, client, clientAuthentication, grantType, parameters, options) {
    const url = resolveEndpoint(as, 'token_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    parameters.set('grant_type', grantType);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    if (options?.DPoP !== undefined) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, 'POST');
    }
    const response = await authenticatedRequest(as, client, clientAuthentication, url, parameters, headers, options);
    options?.DPoP?.cacheNonce(response, url);
    return response;
}
async function refreshTokenGrantRequest(as, client, clientAuthentication, refreshToken, options) {
    assertAs(as);
    assertClient(client);
    assertString(refreshToken, '"refreshToken"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('refresh_token', refreshToken);
    return tokenEndpointRequest(as, client, clientAuthentication, 'refresh_token', parameters, options);
}
const idTokenClaims = new WeakMap();
const jwtRefs = new WeakMap();
function getValidatedIdTokenClaims(ref) {
    if (!ref.id_token) {
        return undefined;
    }
    const claims = idTokenClaims.get(ref);
    if (!claims) {
        throw CodedTypeError('"ref" was already garbage collected or did not resolve from the proper sources', ERR_INVALID_ARG_VALUE);
    }
    return claims;
}
async function validateApplicationLevelSignature(as, ref, options) {
    assertAs(as);
    if (!jwtRefs.has(ref)) {
        throw CodedTypeError('"ref" does not contain a processed JWT Response to verify the signature of', ERR_INVALID_ARG_VALUE);
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwtRefs.get(ref).split('.');
    const header = JSON.parse(buf(b64u(protectedHeader)));
    if (header.alg.startsWith('HS')) {
        throw new UnsupportedOperationError('unsupported JWS algorithm', {
            cause: {
                alg: header.alg
            }
        });
    }
    let key;
    key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, b64u(encodedSignature));
}
async function processGenericAccessTokenResponse(as, client, response, additionalRequiredIdTokenClaims, decryptFn, recognizedTokenTypes) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Token Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.access_token, '"response" body "access_token" property', INVALID_RESPONSE, {
        body: json
    });
    assertString(json.token_type, '"response" body "token_type" property', INVALID_RESPONSE, {
        body: json
    });
    json.token_type = json.token_type.toLowerCase();
    if (json.expires_in !== undefined) {
        let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
        assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
            body: json
        });
        json.expires_in = expiresIn;
    }
    if (json.refresh_token !== undefined) {
        assertString(json.refresh_token, '"response" body "refresh_token" property', INVALID_RESPONSE, {
            body: json
        });
    }
    if (json.scope !== undefined && typeof json.scope !== 'string') {
        throw OPE('"response" body "scope" property must be a string', INVALID_RESPONSE, {
            body: json
        });
    }
    if (json.id_token !== undefined) {
        assertString(json.id_token, '"response" body "id_token" property', INVALID_RESPONSE, {
            body: json
        });
        const requiredClaims = [
            'aud',
            'exp',
            'iat',
            'iss',
            'sub'
        ];
        if (client.require_auth_time === true) {
            requiredClaims.push('auth_time');
        }
        if (client.default_max_age !== undefined) {
            assertNumber(client.default_max_age, true, '"client.default_max_age"');
            requiredClaims.push('auth_time');
        }
        if (additionalRequiredIdTokenClaims?.length) {
            requiredClaims.push(...additionalRequiredIdTokenClaims);
        }
        const { claims, jwt } = await validateJwt(json.id_token, checkSigningAlgorithm.bind(undefined, client.id_token_signed_response_alg, as.id_token_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), decryptFn).then(validatePresence.bind(undefined, requiredClaims)).then(validateIssuer.bind(undefined, as)).then(validateAudience.bind(undefined, client.client_id));
        if (Array.isArray(claims.aud) && claims.aud.length !== 1) {
            if (claims.azp === undefined) {
                throw OPE('ID Token "aud" (audience) claim includes additional untrusted audiences', JWT_CLAIM_COMPARISON, {
                    claims,
                    claim: 'aud'
                });
            }
            if (claims.azp !== client.client_id) {
                throw OPE('unexpected ID Token "azp" (authorized party) claim value', JWT_CLAIM_COMPARISON, {
                    expected: client.client_id,
                    claims,
                    claim: 'azp'
                });
            }
        }
        if (claims.auth_time !== undefined) {
            assertNumber(claims.auth_time, true, 'ID Token "auth_time" (authentication time)', INVALID_RESPONSE, {
                claims
            });
        }
        jwtRefs.set(response, jwt);
        idTokenClaims.set(json, claims);
    }
    if (recognizedTokenTypes?.[json.token_type] !== undefined) {
        recognizedTokenTypes[json.token_type](response, json);
    } else if (json.token_type !== 'dpop' && json.token_type !== 'bearer') {
        throw new UnsupportedOperationError('unsupported `token_type` value', {
            cause: {
                body: json
            }
        });
    }
    return json;
}
function checkAuthenticationChallenges(response) {
    let challenges;
    if (challenges = parseWwwAuthenticateChallenges(response)) {
        throw new WWWAuthenticateChallengeError('server responded with a challenge in the WWW-Authenticate HTTP Header', {
            cause: challenges,
            response
        });
    }
}
async function processRefreshTokenResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
function validateOptionalAudience(expected, result) {
    if (result.claims.aud !== undefined) {
        return validateAudience(expected, result);
    }
    return result;
}
function validateAudience(expected, result) {
    if (Array.isArray(result.claims.aud)) {
        if (!result.claims.aud.includes(expected)) {
            throw OPE('unexpected JWT "aud" (audience) claim value', JWT_CLAIM_COMPARISON, {
                expected,
                claims: result.claims,
                claim: 'aud'
            });
        }
    } else if (result.claims.aud !== expected) {
        throw OPE('unexpected JWT "aud" (audience) claim value', JWT_CLAIM_COMPARISON, {
            expected,
            claims: result.claims,
            claim: 'aud'
        });
    }
    return result;
}
function validateOptionalIssuer(as, result) {
    if (result.claims.iss !== undefined) {
        return validateIssuer(as, result);
    }
    return result;
}
function validateIssuer(as, result) {
    const expected = as[_expectedIssuer]?.(result) ?? as.issuer;
    if (result.claims.iss !== expected) {
        throw OPE('unexpected JWT "iss" (issuer) claim value', JWT_CLAIM_COMPARISON, {
            expected,
            claims: result.claims,
            claim: 'iss'
        });
    }
    return result;
}
const branded = new WeakSet();
function brand(searchParams) {
    branded.add(searchParams);
    return searchParams;
}
const nopkce = Symbol();
async function authorizationCodeGrantRequest(as, client, clientAuthentication, callbackParameters, redirectUri, codeVerifier, options) {
    assertAs(as);
    assertClient(client);
    if (!branded.has(callbackParameters)) {
        throw CodedTypeError('"callbackParameters" must be an instance of URLSearchParams obtained from "validateAuthResponse()", or "validateJwtAuthResponse()', ERR_INVALID_ARG_VALUE);
    }
    assertString(redirectUri, '"redirectUri"');
    const code = getURLSearchParameter(callbackParameters, 'code');
    if (!code) {
        throw OPE('no authorization code in "callbackParameters"', INVALID_RESPONSE);
    }
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('redirect_uri', redirectUri);
    parameters.set('code', code);
    if (codeVerifier !== nopkce) {
        assertString(codeVerifier, '"codeVerifier"');
        parameters.set('code_verifier', codeVerifier);
    }
    return tokenEndpointRequest(as, client, clientAuthentication, 'authorization_code', parameters, options);
}
const jwtClaimNames = {
    aud: 'audience',
    c_hash: 'code hash',
    client_id: 'client id',
    exp: 'expiration time',
    iat: 'issued at',
    iss: 'issuer',
    jti: 'jwt id',
    nonce: 'nonce',
    s_hash: 'state hash',
    sub: 'subject',
    ath: 'access token hash',
    htm: 'http method',
    htu: 'http uri',
    cnf: 'confirmation',
    auth_time: 'authentication time'
};
function validatePresence(required, result) {
    for (const claim of required){
        if (result.claims[claim] === undefined) {
            throw OPE(`JWT "${claim}" (${jwtClaimNames[claim]}) claim missing`, INVALID_RESPONSE, {
                claims: result.claims
            });
        }
    }
    return result;
}
const expectNoNonce = Symbol();
const skipAuthTimeCheck = Symbol();
async function processAuthorizationCodeResponse(as, client, response, options) {
    if (typeof options?.expectedNonce === 'string' || typeof options?.maxAge === 'number' || options?.requireIdToken) {
        return processAuthorizationCodeOpenIDResponse(as, client, response, options.expectedNonce, options.maxAge, options[jweDecrypt], options.recognizedTokenTypes);
    }
    return processAuthorizationCodeOAuth2Response(as, client, response, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function processAuthorizationCodeOpenIDResponse(as, client, response, expectedNonce, maxAge, decryptFn, recognizedTokenTypes) {
    const additionalRequiredClaims = [];
    switch(expectedNonce){
        case undefined:
            expectedNonce = expectNoNonce;
            break;
        case expectNoNonce:
            break;
        default:
            assertString(expectedNonce, '"expectedNonce" argument');
            additionalRequiredClaims.push('nonce');
    }
    maxAge ??= client.default_max_age;
    switch(maxAge){
        case undefined:
            maxAge = skipAuthTimeCheck;
            break;
        case skipAuthTimeCheck:
            break;
        default:
            assertNumber(maxAge, true, '"maxAge" argument');
            additionalRequiredClaims.push('auth_time');
    }
    const result = await processGenericAccessTokenResponse(as, client, response, additionalRequiredClaims, decryptFn, recognizedTokenTypes);
    assertString(result.id_token, '"response" body "id_token" property', INVALID_RESPONSE, {
        body: result
    });
    const claims = getValidatedIdTokenClaims(result);
    if (maxAge !== skipAuthTimeCheck) {
        const now = epochTime() + getClockSkew(client);
        const tolerance = getClockTolerance(client);
        if (claims.auth_time + maxAge < now - tolerance) {
            throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, {
                claims,
                now,
                tolerance,
                claim: 'auth_time'
            });
        }
    }
    if (expectedNonce === expectNoNonce) {
        if (claims.nonce !== undefined) {
            throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
                expected: undefined,
                claims,
                claim: 'nonce'
            });
        }
    } else if (claims.nonce !== expectedNonce) {
        throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
            expected: expectedNonce,
            claims,
            claim: 'nonce'
        });
    }
    return result;
}
async function processAuthorizationCodeOAuth2Response(as, client, response, decryptFn, recognizedTokenTypes) {
    const result = await processGenericAccessTokenResponse(as, client, response, undefined, decryptFn, recognizedTokenTypes);
    const claims = getValidatedIdTokenClaims(result);
    if (claims) {
        if (client.default_max_age !== undefined) {
            assertNumber(client.default_max_age, true, '"client.default_max_age"');
            const now = epochTime() + getClockSkew(client);
            const tolerance = getClockTolerance(client);
            if (claims.auth_time + client.default_max_age < now - tolerance) {
                throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, {
                    claims,
                    now,
                    tolerance,
                    claim: 'auth_time'
                });
            }
        }
        if (claims.nonce !== undefined) {
            throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
                expected: undefined,
                claims,
                claim: 'nonce'
            });
        }
    }
    return result;
}
const WWW_AUTHENTICATE_CHALLENGE = 'OAUTH_WWW_AUTHENTICATE_CHALLENGE';
const RESPONSE_BODY_ERROR = 'OAUTH_RESPONSE_BODY_ERROR';
const UNSUPPORTED_OPERATION = 'OAUTH_UNSUPPORTED_OPERATION';
const AUTHORIZATION_RESPONSE_ERROR = 'OAUTH_AUTHORIZATION_RESPONSE_ERROR';
const JWT_USERINFO_EXPECTED = 'OAUTH_JWT_USERINFO_EXPECTED';
const PARSE_ERROR = 'OAUTH_PARSE_ERROR';
const INVALID_RESPONSE = 'OAUTH_INVALID_RESPONSE';
const INVALID_REQUEST = 'OAUTH_INVALID_REQUEST';
const RESPONSE_IS_NOT_JSON = 'OAUTH_RESPONSE_IS_NOT_JSON';
const RESPONSE_IS_NOT_CONFORM = 'OAUTH_RESPONSE_IS_NOT_CONFORM';
const HTTP_REQUEST_FORBIDDEN = 'OAUTH_HTTP_REQUEST_FORBIDDEN';
const REQUEST_PROTOCOL_FORBIDDEN = 'OAUTH_REQUEST_PROTOCOL_FORBIDDEN';
const JWT_TIMESTAMP_CHECK = 'OAUTH_JWT_TIMESTAMP_CHECK_FAILED';
const JWT_CLAIM_COMPARISON = 'OAUTH_JWT_CLAIM_COMPARISON_FAILED';
const JSON_ATTRIBUTE_COMPARISON = 'OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED';
const KEY_SELECTION = 'OAUTH_KEY_SELECTION_FAILED';
const MISSING_SERVER_METADATA = 'OAUTH_MISSING_SERVER_METADATA';
const INVALID_SERVER_METADATA = 'OAUTH_INVALID_SERVER_METADATA';
function checkJwtType(expected, result) {
    if (typeof result.header.typ !== 'string' || normalizeTyp(result.header.typ) !== expected) {
        throw OPE('unexpected JWT "typ" header parameter value', INVALID_RESPONSE, {
            header: result.header
        });
    }
    return result;
}
async function clientCredentialsGrantRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    return tokenEndpointRequest(as, client, clientAuthentication, 'client_credentials', new URLSearchParams(parameters), options);
}
async function genericTokenEndpointRequest(as, client, clientAuthentication, grantType, parameters, options) {
    assertAs(as);
    assertClient(client);
    assertString(grantType, '"grantType"');
    return tokenEndpointRequest(as, client, clientAuthentication, grantType, new URLSearchParams(parameters), options);
}
async function processGenericTokenEndpointResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function processClientCredentialsResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function revocationRequest(as, client, clientAuthentication, token, options) {
    assertAs(as);
    assertClient(client);
    assertString(token, '"token"');
    const url = resolveEndpoint(as, 'revocation_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(options?.additionalParameters);
    body.set('token', token);
    const headers = prepareHeaders(options?.headers);
    headers.delete('accept');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processRevocationResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Revocation Endpoint');
    return undefined;
}
function assertReadableResponse(response) {
    if (response.bodyUsed) {
        throw CodedTypeError('"response" body has been used already', ERR_INVALID_ARG_VALUE);
    }
}
async function introspectionRequest(as, client, clientAuthentication, token, options) {
    assertAs(as);
    assertClient(client);
    assertString(token, '"token"');
    const url = resolveEndpoint(as, 'introspection_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(options?.additionalParameters);
    body.set('token', token);
    const headers = prepareHeaders(options?.headers);
    if (options?.requestJwtResponse ?? client.introspection_signed_response_alg) {
        headers.set('accept', 'application/token-introspection+jwt');
    } else {
        headers.set('accept', 'application/json');
    }
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processIntrospectionResponse(as, client, response, options) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Introspection Endpoint');
    let json;
    if (getContentType(response) === 'application/token-introspection+jwt') {
        assertReadableResponse(response);
        const { claims, jwt } = await validateJwt(await response.text(), checkSigningAlgorithm.bind(undefined, client.introspection_signed_response_alg, as.introspection_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt]).then(checkJwtType.bind(undefined, 'token-introspection+jwt')).then(validatePresence.bind(undefined, [
            'aud',
            'iat',
            'iss'
        ])).then(validateIssuer.bind(undefined, as)).then(validateAudience.bind(undefined, client.client_id));
        jwtRefs.set(response, jwt);
        if (!isJsonObject(claims.token_introspection)) {
            throw OPE('JWT "token_introspection" claim must be a JSON object', INVALID_RESPONSE, {
                claims
            });
        }
        json = claims.token_introspection;
    } else {
        assertReadableResponse(response);
        json = await getResponseJsonBody(response);
    }
    if (typeof json.active !== 'boolean') {
        throw OPE('"response" body "active" property must be a boolean', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
async function jwksRequest(as, options) {
    assertAs(as);
    const url = resolveEndpoint(as, 'jwks_uri', false, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    headers.append('accept', 'application/jwk-set+json');
    return (options?.[customFetch] || fetch)(url.href, {
        body: undefined,
        headers: Object.fromEntries(headers.entries()),
        method: 'GET',
        redirect: 'manual',
        signal: signal(url, options?.signal)
    });
}
async function processJwksResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform JSON Web Key Set response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response, (response)=>assertContentTypes(response, 'application/json', 'application/jwk-set+json'));
    if (!Array.isArray(json.keys)) {
        throw OPE('"response" body "keys" property must be an array', INVALID_RESPONSE, {
            body: json
        });
    }
    if (!Array.prototype.every.call(json.keys, isJsonObject)) {
        throw OPE('"response" body "keys" property members must be JWK formatted objects', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
function supported(alg) {
    switch(alg){
        case 'PS256':
        case 'ES256':
        case 'RS256':
        case 'PS384':
        case 'ES384':
        case 'RS384':
        case 'PS512':
        case 'ES512':
        case 'RS512':
        case 'Ed25519':
        case 'EdDSA':
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
            return true;
        default:
            return false;
    }
}
function checkSupportedJwsAlg(header) {
    if (!supported(header.alg)) {
        throw new UnsupportedOperationError('unsupported JWS "alg" identifier', {
            cause: {
                alg: header.alg
            }
        });
    }
}
function checkRsaKeyAlgorithm(key) {
    const { algorithm } = key;
    if (typeof algorithm.modulusLength !== 'number' || algorithm.modulusLength < 2048) {
        throw new UnsupportedOperationError(`unsupported ${algorithm.name} modulusLength`, {
            cause: key
        });
    }
}
function ecdsaHashName(key) {
    const { algorithm } = key;
    switch(algorithm.namedCurve){
        case 'P-256':
            return 'SHA-256';
        case 'P-384':
            return 'SHA-384';
        case 'P-521':
            return 'SHA-512';
        default:
            throw new UnsupportedOperationError('unsupported ECDSA namedCurve', {
                cause: key
            });
    }
}
function keyToSubtle(key) {
    switch(key.algorithm.name){
        case 'ECDSA':
            return {
                name: key.algorithm.name,
                hash: ecdsaHashName(key)
            };
        case 'RSA-PSS':
            {
                checkRsaKeyAlgorithm(key);
                switch(key.algorithm.hash.name){
                    case 'SHA-256':
                    case 'SHA-384':
                    case 'SHA-512':
                        return {
                            name: key.algorithm.name,
                            saltLength: parseInt(key.algorithm.hash.name.slice(-3), 10) >> 3
                        };
                    default:
                        throw new UnsupportedOperationError('unsupported RSA-PSS hash name', {
                            cause: key
                        });
                }
            }
        case 'RSASSA-PKCS1-v1_5':
            checkRsaKeyAlgorithm(key);
            return key.algorithm.name;
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
        case 'Ed25519':
            return key.algorithm.name;
    }
    throw new UnsupportedOperationError('unsupported CryptoKey algorithm name', {
        cause: key
    });
}
async function validateJwsSignature(protectedHeader, payload, key, signature) {
    const data = buf(`${protectedHeader}.${payload}`);
    const algorithm = keyToSubtle(key);
    const verified = await crypto.subtle.verify(algorithm, key, signature, data);
    if (!verified) {
        throw OPE('JWT signature verification failed', INVALID_RESPONSE, {
            key,
            data,
            signature,
            algorithm
        });
    }
}
async function validateJwt(jws, checkAlg, clockSkew, clockTolerance, decryptJwt) {
    let { 0: protectedHeader, 1: payload, length } = jws.split('.');
    if (length === 5) {
        if (decryptJwt !== undefined) {
            jws = await decryptJwt(jws);
            ({ 0: protectedHeader, 1: payload, length } = jws.split('.'));
        } else {
            throw new UnsupportedOperationError('JWE decryption is not configured', {
                cause: jws
            });
        }
    }
    if (length !== 3) {
        throw OPE('Invalid JWT', INVALID_RESPONSE, jws);
    }
    let header;
    try {
        header = JSON.parse(buf(b64u(protectedHeader)));
    } catch (cause) {
        throw OPE('failed to parse JWT Header body as base64url encoded JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(header)) {
        throw OPE('JWT Header must be a top level object', INVALID_RESPONSE, jws);
    }
    checkAlg(header);
    if (header.crit !== undefined) {
        throw new UnsupportedOperationError('no JWT "crit" header parameter extensions are supported', {
            cause: {
                header
            }
        });
    }
    let claims;
    try {
        claims = JSON.parse(buf(b64u(payload)));
    } catch (cause) {
        throw OPE('failed to parse JWT Payload body as base64url encoded JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(claims)) {
        throw OPE('JWT Payload must be a top level object', INVALID_RESPONSE, jws);
    }
    const now = epochTime() + clockSkew;
    if (claims.exp !== undefined) {
        if (typeof claims.exp !== 'number') {
            throw OPE('unexpected JWT "exp" (expiration time) claim type', INVALID_RESPONSE, {
                claims
            });
        }
        if (claims.exp <= now - clockTolerance) {
            throw OPE('unexpected JWT "exp" (expiration time) claim value, expiration is past current timestamp', JWT_TIMESTAMP_CHECK, {
                claims,
                now,
                tolerance: clockTolerance,
                claim: 'exp'
            });
        }
    }
    if (claims.iat !== undefined) {
        if (typeof claims.iat !== 'number') {
            throw OPE('unexpected JWT "iat" (issued at) claim type', INVALID_RESPONSE, {
                claims
            });
        }
    }
    if (claims.iss !== undefined) {
        if (typeof claims.iss !== 'string') {
            throw OPE('unexpected JWT "iss" (issuer) claim type', INVALID_RESPONSE, {
                claims
            });
        }
    }
    if (claims.nbf !== undefined) {
        if (typeof claims.nbf !== 'number') {
            throw OPE('unexpected JWT "nbf" (not before) claim type', INVALID_RESPONSE, {
                claims
            });
        }
        if (claims.nbf > now + clockTolerance) {
            throw OPE('unexpected JWT "nbf" (not before) claim value', JWT_TIMESTAMP_CHECK, {
                claims,
                now,
                tolerance: clockTolerance,
                claim: 'nbf'
            });
        }
    }
    if (claims.aud !== undefined) {
        if (typeof claims.aud !== 'string' && !Array.isArray(claims.aud)) {
            throw OPE('unexpected JWT "aud" (audience) claim type', INVALID_RESPONSE, {
                claims
            });
        }
    }
    return {
        header,
        claims,
        jwt: jws
    };
}
async function validateJwtAuthResponse(as, client, parameters, expectedState, options) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        parameters = parameters.searchParams;
    }
    if (!(parameters instanceof URLSearchParams)) {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, or URL', ERR_INVALID_ARG_TYPE);
    }
    const response = getURLSearchParameter(parameters, 'response');
    if (!response) {
        throw OPE('"parameters" does not contain a JARM response', INVALID_RESPONSE);
    }
    const { claims, header, jwt } = await validateJwt(response, checkSigningAlgorithm.bind(undefined, client.authorization_signed_response_alg, as.authorization_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt]).then(validatePresence.bind(undefined, [
        'aud',
        'exp',
        'iss'
    ])).then(validateIssuer.bind(undefined, as)).then(validateAudience.bind(undefined, client.client_id));
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwt.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    const result = new URLSearchParams();
    for (const [key, value] of Object.entries(claims)){
        if (typeof value === 'string' && key !== 'aud') {
            result.set(key, value);
        }
    }
    return validateAuthResponse(as, client, result, expectedState);
}
async function idTokenHash(data, header, claimName) {
    let algorithm;
    switch(header.alg){
        case 'RS256':
        case 'PS256':
        case 'ES256':
            algorithm = 'SHA-256';
            break;
        case 'RS384':
        case 'PS384':
        case 'ES384':
            algorithm = 'SHA-384';
            break;
        case 'RS512':
        case 'PS512':
        case 'ES512':
        case 'Ed25519':
        case 'EdDSA':
            algorithm = 'SHA-512';
            break;
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
            algorithm = {
                name: 'cSHAKE256',
                length: 512,
                outputLength: 512
            };
            break;
        default:
            throw new UnsupportedOperationError(`unsupported JWS algorithm for ${claimName} calculation`, {
                cause: {
                    alg: header.alg
                }
            });
    }
    const digest = await crypto.subtle.digest(algorithm, buf(data));
    return b64u(digest.slice(0, digest.byteLength / 2));
}
async function idTokenHashMatches(data, actual, header, claimName) {
    const expected = await idTokenHash(data, header, claimName);
    return actual === expected;
}
async function validateDetachedSignatureResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options) {
    return validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, true);
}
async function validateCodeIdTokenResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options) {
    return validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, false);
}
async function consumeStream(request) {
    if (request.bodyUsed) {
        throw CodedTypeError('form_post Request instances must contain a readable body', ERR_INVALID_ARG_VALUE, {
            cause: request
        });
    }
    return request.text();
}
async function formPostResponse(request) {
    if (request.method !== 'POST') {
        throw CodedTypeError('form_post responses are expected to use the POST method', ERR_INVALID_ARG_VALUE, {
            cause: request
        });
    }
    if (getContentType(request) !== 'application/x-www-form-urlencoded') {
        throw CodedTypeError('form_post responses are expected to use the application/x-www-form-urlencoded content-type', ERR_INVALID_ARG_VALUE, {
            cause: request
        });
    }
    return consumeStream(request);
}
async function validateHybridResponse(as, client, parameters, expectedNonce, expectedState, maxAge, options, fapi) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        if (!parameters.hash.length) {
            throw CodedTypeError('"parameters" as an instance of URL must contain a hash (fragment) with the Authorization Response parameters', ERR_INVALID_ARG_VALUE);
        }
        parameters = new URLSearchParams(parameters.hash.slice(1));
    } else if (looseInstanceOf(parameters, Request)) {
        parameters = new URLSearchParams(await formPostResponse(parameters));
    } else if (parameters instanceof URLSearchParams) {
        parameters = new URLSearchParams(parameters);
    } else {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, URL, or Response', ERR_INVALID_ARG_TYPE);
    }
    const id_token = getURLSearchParameter(parameters, 'id_token');
    parameters.delete('id_token');
    switch(expectedState){
        case undefined:
        case expectNoState:
            break;
        default:
            assertString(expectedState, '"expectedState" argument');
    }
    const result = validateAuthResponse({
        ...as,
        authorization_response_iss_parameter_supported: false
    }, client, parameters, expectedState);
    if (!id_token) {
        throw OPE('"parameters" does not contain an ID Token', INVALID_RESPONSE);
    }
    const code = getURLSearchParameter(parameters, 'code');
    if (!code) {
        throw OPE('"parameters" does not contain an Authorization Code', INVALID_RESPONSE);
    }
    const requiredClaims = [
        'aud',
        'exp',
        'iat',
        'iss',
        'sub',
        'nonce',
        'c_hash'
    ];
    const state = parameters.get('state');
    if (fapi && (typeof expectedState === 'string' || state !== null)) {
        requiredClaims.push('s_hash');
    }
    if (maxAge !== undefined) {
        assertNumber(maxAge, true, '"maxAge" argument');
    } else if (client.default_max_age !== undefined) {
        assertNumber(client.default_max_age, true, '"client.default_max_age"');
    }
    maxAge ??= client.default_max_age ?? skipAuthTimeCheck;
    if (client.require_auth_time || maxAge !== skipAuthTimeCheck) {
        requiredClaims.push('auth_time');
    }
    const { claims, header, jwt } = await validateJwt(id_token, checkSigningAlgorithm.bind(undefined, client.id_token_signed_response_alg, as.id_token_signing_alg_values_supported, 'RS256'), getClockSkew(client), getClockTolerance(client), options?.[jweDecrypt]).then(validatePresence.bind(undefined, requiredClaims)).then(validateIssuer.bind(undefined, as)).then(validateAudience.bind(undefined, client.client_id));
    const clockSkew = getClockSkew(client);
    const now = epochTime() + clockSkew;
    if (claims.iat < now - 3600) {
        throw OPE('unexpected JWT "iat" (issued at) claim value, it is too far in the past', JWT_TIMESTAMP_CHECK, {
            now,
            claims,
            claim: 'iat'
        });
    }
    assertString(claims.c_hash, 'ID Token "c_hash" (code hash) claim value', INVALID_RESPONSE, {
        claims
    });
    if (claims.auth_time !== undefined) {
        assertNumber(claims.auth_time, true, 'ID Token "auth_time" (authentication time)', INVALID_RESPONSE, {
            claims
        });
    }
    if (maxAge !== skipAuthTimeCheck) {
        const now = epochTime() + getClockSkew(client);
        const tolerance = getClockTolerance(client);
        if (claims.auth_time + maxAge < now - tolerance) {
            throw OPE('too much time has elapsed since the last End-User authentication', JWT_TIMESTAMP_CHECK, {
                claims,
                now,
                tolerance,
                claim: 'auth_time'
            });
        }
    }
    assertString(expectedNonce, '"expectedNonce" argument');
    if (claims.nonce !== expectedNonce) {
        throw OPE('unexpected ID Token "nonce" claim value', JWT_CLAIM_COMPARISON, {
            expected: expectedNonce,
            claims,
            claim: 'nonce'
        });
    }
    if (Array.isArray(claims.aud) && claims.aud.length !== 1) {
        if (claims.azp === undefined) {
            throw OPE('ID Token "aud" (audience) claim includes additional untrusted audiences', JWT_CLAIM_COMPARISON, {
                claims,
                claim: 'aud'
            });
        }
        if (claims.azp !== client.client_id) {
            throw OPE('unexpected ID Token "azp" (authorized party) claim value', JWT_CLAIM_COMPARISON, {
                expected: client.client_id,
                claims,
                claim: 'azp'
            });
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = jwt.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    if (await idTokenHashMatches(code, claims.c_hash, header, 'c_hash') !== true) {
        throw OPE('invalid ID Token "c_hash" (code hash) claim value', JWT_CLAIM_COMPARISON, {
            code,
            alg: header.alg,
            claim: 'c_hash',
            claims
        });
    }
    if (fapi && state !== null || claims.s_hash !== undefined) {
        assertString(claims.s_hash, 'ID Token "s_hash" (state hash) claim value', INVALID_RESPONSE, {
            claims
        });
        assertString(state, '"state" response parameter', INVALID_RESPONSE, {
            parameters
        });
        if (await idTokenHashMatches(state, claims.s_hash, header, 's_hash') !== true) {
            throw OPE('invalid ID Token "s_hash" (state hash) claim value', JWT_CLAIM_COMPARISON, {
                state,
                alg: header.alg,
                claim: 's_hash',
                claims
            });
        }
    }
    return result;
}
function checkSigningAlgorithm(client, issuer, fallback, header) {
    if (client !== undefined) {
        if (typeof client === 'string' ? header.alg !== client : !client.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: client,
                reason: 'client configuration'
            });
        }
        return;
    }
    if (Array.isArray(issuer)) {
        if (!issuer.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: issuer,
                reason: 'authorization server metadata'
            });
        }
        return;
    }
    if (fallback !== undefined) {
        if (typeof fallback === 'string' ? header.alg !== fallback : typeof fallback === 'function' ? !fallback(header.alg) : !fallback.includes(header.alg)) {
            throw OPE('unexpected JWT "alg" header parameter', INVALID_RESPONSE, {
                header,
                expected: fallback,
                reason: 'default value'
            });
        }
        return;
    }
    throw OPE('missing client or server configuration to verify used JWT "alg" header parameter', undefined, {
        client,
        issuer,
        fallback
    });
}
function getURLSearchParameter(parameters, name) {
    const { 0: value, length } = parameters.getAll(name);
    if (length > 1) {
        throw OPE(`"${name}" parameter must be provided only once`, INVALID_RESPONSE);
    }
    return value;
}
const skipStateCheck = Symbol();
const expectNoState = Symbol();
function validateAuthResponse(as, client, parameters, expectedState) {
    assertAs(as);
    assertClient(client);
    if (parameters instanceof URL) {
        parameters = parameters.searchParams;
    }
    if (!(parameters instanceof URLSearchParams)) {
        throw CodedTypeError('"parameters" must be an instance of URLSearchParams, or URL', ERR_INVALID_ARG_TYPE);
    }
    if (getURLSearchParameter(parameters, 'response')) {
        throw OPE('"parameters" contains a JARM response, use validateJwtAuthResponse() instead of validateAuthResponse()', INVALID_RESPONSE, {
            parameters
        });
    }
    const iss = getURLSearchParameter(parameters, 'iss');
    const state = getURLSearchParameter(parameters, 'state');
    if (!iss && as.authorization_response_iss_parameter_supported) {
        throw OPE('response parameter "iss" (issuer) missing', INVALID_RESPONSE, {
            parameters
        });
    }
    if (iss && iss !== as.issuer) {
        throw OPE('unexpected "iss" (issuer) response parameter value', INVALID_RESPONSE, {
            expected: as.issuer,
            parameters
        });
    }
    switch(expectedState){
        case undefined:
        case expectNoState:
            if (state !== undefined) {
                throw OPE('unexpected "state" response parameter encountered', INVALID_RESPONSE, {
                    expected: undefined,
                    parameters
                });
            }
            break;
        case skipStateCheck:
            break;
        default:
            assertString(expectedState, '"expectedState" argument');
            if (state !== expectedState) {
                throw OPE(state === undefined ? 'response parameter "state" missing' : 'unexpected "state" response parameter value', INVALID_RESPONSE, {
                    expected: expectedState,
                    parameters
                });
            }
    }
    const error = getURLSearchParameter(parameters, 'error');
    if (error) {
        throw new AuthorizationResponseError('authorization response from the server is an error', {
            cause: parameters
        });
    }
    const id_token = getURLSearchParameter(parameters, 'id_token');
    const token = getURLSearchParameter(parameters, 'token');
    if (id_token !== undefined || token !== undefined) {
        throw new UnsupportedOperationError('implicit and hybrid flows are not supported');
    }
    return brand(new URLSearchParams(parameters));
}
function algToSubtle(alg) {
    switch(alg){
        case 'PS256':
        case 'PS384':
        case 'PS512':
            return {
                name: 'RSA-PSS',
                hash: `SHA-${alg.slice(-3)}`
            };
        case 'RS256':
        case 'RS384':
        case 'RS512':
            return {
                name: 'RSASSA-PKCS1-v1_5',
                hash: `SHA-${alg.slice(-3)}`
            };
        case 'ES256':
        case 'ES384':
            return {
                name: 'ECDSA',
                namedCurve: `P-${alg.slice(-3)}`
            };
        case 'ES512':
            return {
                name: 'ECDSA',
                namedCurve: 'P-521'
            };
        case 'EdDSA':
            return 'Ed25519';
        case 'Ed25519':
        case 'ML-DSA-44':
        case 'ML-DSA-65':
        case 'ML-DSA-87':
            return alg;
        default:
            throw new UnsupportedOperationError('unsupported JWS algorithm', {
                cause: {
                    alg
                }
            });
    }
}
async function importJwk(alg, jwk) {
    const { ext, key_ops, use, ...key } = jwk;
    return crypto.subtle.importKey('jwk', key, algToSubtle(alg), true, [
        'verify'
    ]);
}
async function deviceAuthorizationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'device_authorization_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processDeviceAuthorizationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Device Authorization Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.device_code, '"response" body "device_code" property', INVALID_RESPONSE, {
        body: json
    });
    assertString(json.user_code, '"response" body "user_code" property', INVALID_RESPONSE, {
        body: json
    });
    assertString(json.verification_uri, '"response" body "verification_uri" property', INVALID_RESPONSE, {
        body: json
    });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json
    });
    json.expires_in = expiresIn;
    if (json.verification_uri_complete !== undefined) {
        assertString(json.verification_uri_complete, '"response" body "verification_uri_complete" property', INVALID_RESPONSE, {
            body: json
        });
    }
    if (json.interval !== undefined) {
        assertNumber(json.interval, false, '"response" body "interval" property', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
async function deviceCodeGrantRequest(as, client, clientAuthentication, deviceCode, options) {
    assertAs(as);
    assertClient(client);
    assertString(deviceCode, '"deviceCode"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('device_code', deviceCode);
    return tokenEndpointRequest(as, client, clientAuthentication, 'urn:ietf:params:oauth:grant-type:device_code', parameters, options);
}
async function processDeviceCodeResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function generateKeyPair(alg, options) {
    assertString(alg, '"alg"');
    const algorithm = algToSubtle(alg);
    if (alg.startsWith('PS') || alg.startsWith('RS')) {
        Object.assign(algorithm, {
            modulusLength: options?.modulusLength ?? 2048,
            publicExponent: new Uint8Array([
                0x01,
                0x00,
                0x01
            ])
        });
    }
    return crypto.subtle.generateKey(algorithm, options?.extractable ?? false, [
        'sign',
        'verify'
    ]);
}
function normalizeHtu(htu) {
    const url = new URL(htu);
    url.search = '';
    url.hash = '';
    return url.href;
}
async function validateDPoP(request, accessToken, accessTokenClaims, options) {
    const headerValue = request.headers.get('dpop');
    if (headerValue === null) {
        throw OPE('operation indicated DPoP use but the request has no DPoP HTTP Header', INVALID_REQUEST, {
            headers: request.headers
        });
    }
    if (request.headers.get('authorization')?.toLowerCase().startsWith('dpop ') === false) {
        throw OPE(`operation indicated DPoP use but the request's Authorization HTTP Header scheme is not DPoP`, INVALID_REQUEST, {
            headers: request.headers
        });
    }
    if (typeof accessTokenClaims.cnf?.jkt !== 'string') {
        throw OPE('operation indicated DPoP use but the JWT Access Token has no jkt confirmation claim', INVALID_REQUEST, {
            claims: accessTokenClaims
        });
    }
    const clockSkew = getClockSkew(options);
    const proof = await validateJwt(headerValue, checkSigningAlgorithm.bind(undefined, options?.signingAlgorithms, undefined, supported), clockSkew, getClockTolerance(options), undefined).then(checkJwtType.bind(undefined, 'dpop+jwt')).then(validatePresence.bind(undefined, [
        'iat',
        'jti',
        'ath',
        'htm',
        'htu'
    ]));
    const now = epochTime() + clockSkew;
    const diff = Math.abs(now - proof.claims.iat);
    if (diff > 300) {
        throw OPE('DPoP Proof iat is not recent enough', JWT_TIMESTAMP_CHECK, {
            now,
            claims: proof.claims,
            claim: 'iat'
        });
    }
    if (proof.claims.htm !== request.method) {
        throw OPE('DPoP Proof htm mismatch', JWT_CLAIM_COMPARISON, {
            expected: request.method,
            claims: proof.claims,
            claim: 'htm'
        });
    }
    if (typeof proof.claims.htu !== 'string' || normalizeHtu(proof.claims.htu) !== normalizeHtu(request.url)) {
        throw OPE('DPoP Proof htu mismatch', JWT_CLAIM_COMPARISON, {
            expected: normalizeHtu(request.url),
            claims: proof.claims,
            claim: 'htu'
        });
    }
    {
        const expected = b64u(await crypto.subtle.digest('SHA-256', buf(accessToken)));
        if (proof.claims.ath !== expected) {
            throw OPE('DPoP Proof ath mismatch', JWT_CLAIM_COMPARISON, {
                expected,
                claims: proof.claims,
                claim: 'ath'
            });
        }
    }
    const { jwk, alg } = proof.header;
    if (!isJsonObject(jwk)) {
        throw OPE('DPoP Proof jwk header parameter must be a JSON object', INVALID_REQUEST, {
            header: proof.header
        });
    }
    {
        const expected = await calculateJwkThumbprint(jwk);
        if (accessTokenClaims.cnf.jkt !== expected) {
            throw OPE('JWT Access Token confirmation mismatch', JWT_CLAIM_COMPARISON, {
                expected,
                claims: accessTokenClaims,
                claim: 'cnf.jkt'
            });
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = headerValue.split('.');
    const signature = b64u(encodedSignature);
    const key = await importJwk(alg, jwk);
    if (key.type !== 'public') {
        throw OPE('DPoP Proof jwk header parameter must contain a public key', INVALID_REQUEST, {
            header: proof.header
        });
    }
    await validateJwsSignature(protectedHeader, payload, key, signature);
}
async function validateJwtAccessToken(as, request, expectedAudience, options) {
    assertAs(as);
    if (!looseInstanceOf(request, Request)) {
        throw CodedTypeError('"request" must be an instance of Request', ERR_INVALID_ARG_TYPE);
    }
    assertString(expectedAudience, '"expectedAudience"');
    const authorization = request.headers.get('authorization');
    if (authorization === null) {
        throw OPE('"request" is missing an Authorization HTTP Header', INVALID_REQUEST, {
            headers: request.headers
        });
    }
    let { 0: scheme, 1: accessToken, length } = authorization.split(' ');
    scheme = scheme.toLowerCase();
    switch(scheme){
        case 'dpop':
        case 'bearer':
            break;
        default:
            throw new UnsupportedOperationError('unsupported Authorization HTTP Header scheme', {
                cause: {
                    headers: request.headers
                }
            });
    }
    if (length !== 2) {
        throw OPE('invalid Authorization HTTP Header format', INVALID_REQUEST, {
            headers: request.headers
        });
    }
    const requiredClaims = [
        'iss',
        'exp',
        'aud',
        'sub',
        'iat',
        'jti',
        'client_id'
    ];
    if (options?.requireDPoP || scheme === 'dpop' || request.headers.has('dpop')) {
        requiredClaims.push('cnf');
    }
    const { claims, header } = await validateJwt(accessToken, checkSigningAlgorithm.bind(undefined, options?.signingAlgorithms, undefined, supported), getClockSkew(options), getClockTolerance(options), undefined).then(checkJwtType.bind(undefined, 'at+jwt')).then(validatePresence.bind(undefined, requiredClaims)).then(validateIssuer.bind(undefined, as)).then(validateAudience.bind(undefined, expectedAudience)).catch(reassignRSCode);
    for (const claim of [
        'client_id',
        'jti',
        'sub'
    ]){
        if (typeof claims[claim] !== 'string') {
            throw OPE(`unexpected JWT "${claim}" claim type`, INVALID_REQUEST, {
                claims
            });
        }
    }
    if ('cnf' in claims) {
        if (!isJsonObject(claims.cnf)) {
            throw OPE('unexpected JWT "cnf" (confirmation) claim value', INVALID_REQUEST, {
                claims
            });
        }
        const { 0: cnf, length } = Object.keys(claims.cnf);
        if (length) {
            if (length !== 1) {
                throw new UnsupportedOperationError('multiple confirmation claims are not supported', {
                    cause: {
                        claims
                    }
                });
            }
            if (cnf !== 'jkt') {
                throw new UnsupportedOperationError('unsupported JWT Confirmation method', {
                    cause: {
                        claims
                    }
                });
            }
        }
    }
    const { 0: protectedHeader, 1: payload, 2: encodedSignature } = accessToken.split('.');
    const signature = b64u(encodedSignature);
    const key = await getPublicSigKeyFromIssuerJwksUri(as, options, header);
    await validateJwsSignature(protectedHeader, payload, key, signature);
    if (options?.requireDPoP || scheme === 'dpop' || claims.cnf?.jkt !== undefined || request.headers.has('dpop')) {
        await validateDPoP(request, accessToken, claims, options).catch(reassignRSCode);
    }
    return claims;
}
function reassignRSCode(err) {
    if (err instanceof OperationProcessingError && err?.code === INVALID_REQUEST) {
        err.code = INVALID_RESPONSE;
    }
    throw err;
}
async function backchannelAuthenticationRequest(as, client, clientAuthentication, parameters, options) {
    assertAs(as);
    assertClient(client);
    const url = resolveEndpoint(as, 'backchannel_authentication_endpoint', client.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const body = new URLSearchParams(parameters);
    body.set('client_id', client.client_id);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    return authenticatedRequest(as, client, clientAuthentication, url, body, headers, options);
}
async function processBackchannelAuthenticationResponse(as, client, response) {
    assertAs(as);
    assertClient(client);
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 200, 'Backchannel Authentication Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.auth_req_id, '"response" body "auth_req_id" property', INVALID_RESPONSE, {
        body: json
    });
    let expiresIn = typeof json.expires_in !== 'number' ? parseFloat(json.expires_in) : json.expires_in;
    assertNumber(expiresIn, true, '"response" body "expires_in" property', INVALID_RESPONSE, {
        body: json
    });
    json.expires_in = expiresIn;
    if (json.interval !== undefined) {
        assertNumber(json.interval, false, '"response" body "interval" property', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
async function backchannelAuthenticationGrantRequest(as, client, clientAuthentication, authReqId, options) {
    assertAs(as);
    assertClient(client);
    assertString(authReqId, '"authReqId"');
    const parameters = new URLSearchParams(options?.additionalParameters);
    parameters.set('auth_req_id', authReqId);
    return tokenEndpointRequest(as, client, clientAuthentication, 'urn:openid:params:grant-type:ciba', parameters, options);
}
async function processBackchannelAuthenticationGrantResponse(as, client, response, options) {
    return processGenericAccessTokenResponse(as, client, response, undefined, options?.[jweDecrypt], options?.recognizedTokenTypes);
}
async function dynamicClientRegistrationRequest(as, metadata, options) {
    assertAs(as);
    const url = resolveEndpoint(as, 'registration_endpoint', metadata.use_mtls_endpoint_aliases, options?.[allowInsecureRequests] !== true);
    const headers = prepareHeaders(options?.headers);
    headers.set('accept', 'application/json');
    headers.set('content-type', 'application/json');
    const method = 'POST';
    if (options?.DPoP) {
        assertDPoP(options.DPoP);
        await options.DPoP.addProof(url, headers, method, options.initialAccessToken);
    }
    if (options?.initialAccessToken) {
        headers.set('authorization', `${headers.has('dpop') ? 'DPoP' : 'Bearer'} ${options.initialAccessToken}`);
    }
    const response = await (options?.[customFetch] || fetch)(url.href, {
        body: JSON.stringify(metadata),
        headers: Object.fromEntries(headers.entries()),
        method,
        redirect: 'manual',
        signal: signal(url, options?.signal)
    });
    options?.DPoP?.cacheNonce(response, url);
    return response;
}
async function processDynamicClientRegistrationResponse(response) {
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    await checkOAuthBodyError(response, 201, 'Dynamic Client Registration Endpoint');
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.client_id, '"response" body "client_id" property', INVALID_RESPONSE, {
        body: json
    });
    if (json.client_secret !== undefined) {
        assertString(json.client_secret, '"response" body "client_secret" property', INVALID_RESPONSE, {
            body: json
        });
    }
    if (json.client_secret) {
        assertNumber(json.client_secret_expires_at, true, '"response" body "client_secret_expires_at" property', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
async function resourceDiscoveryRequest(resourceIdentifier, options) {
    return performDiscovery(resourceIdentifier, 'resourceIdentifier', (url)=>{
        prependWellKnown(url, '.well-known/oauth-protected-resource', true);
        return url;
    }, options);
}
async function processResourceDiscoveryResponse(expectedResourceIdentifier, response) {
    const expected = expectedResourceIdentifier;
    if (!(expected instanceof URL) && expected !== _nodiscoverycheck) {
        throw CodedTypeError('"expectedResourceIdentifier" must be an instance of URL', ERR_INVALID_ARG_TYPE);
    }
    if (!looseInstanceOf(response, Response)) {
        throw CodedTypeError('"response" must be an instance of Response', ERR_INVALID_ARG_TYPE);
    }
    if (response.status !== 200) {
        throw OPE('"response" is not a conform Resource Server Metadata response (unexpected HTTP status code)', RESPONSE_IS_NOT_CONFORM, response);
    }
    assertReadableResponse(response);
    const json = await getResponseJsonBody(response);
    assertString(json.resource, '"response" body "resource" property', INVALID_RESPONSE, {
        body: json
    });
    if (expected !== _nodiscoverycheck && new URL(json.resource).href !== expected.href) {
        throw OPE('"response" body "resource" property does not match the expected value', JSON_ATTRIBUTE_COMPARISON, {
            expected: expected.href,
            body: json,
            attribute: 'resource'
        });
    }
    return json;
}
async function getResponseJsonBody(response, check = assertApplicationJson) {
    let json;
    try {
        json = await response.json();
    } catch (cause) {
        check(response);
        throw OPE('failed to parse "response" body as JSON', PARSE_ERROR, cause);
    }
    if (!isJsonObject(json)) {
        throw OPE('"response" body must be a top level object', INVALID_RESPONSE, {
            body: json
        });
    }
    return json;
}
const _nopkce = nopkce;
const _nodiscoverycheck = Symbol();
const _expectedIssuer = Symbol();
}),
"[project]/node_modules/preact-render-to-string/dist/index.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "render",
    ()=>F,
    "renderToStaticMarkup",
    ()=>M,
    "renderToString",
    ()=>D,
    "renderToStringAsync",
    ()=>S
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/preact/dist/preact.mjs [app-route] (ecmascript)");
;
var r = /[\s\n\\/='"\0<>]/, o = /^(xlink|xmlns|xml)([A-Z])/, i = /^accessK|^auto[A-Z]|^cell|^ch|^col|cont|cross|dateT|encT|form[A-Z]|frame|hrefL|inputM|maxL|minL|noV|playsI|popoverT|readO|rowS|src[A-Z]|tabI|useM|item[A-Z]/, a = /^ac|^ali|arabic|basel|cap|clipPath$|clipRule$|color|dominant|enable|fill|flood|font|glyph[^R]|horiz|image|letter|lighting|marker[^WUH]|overline|panose|pointe|paint|rendering|shape|stop|strikethrough|stroke|text[^L]|transform|underline|unicode|units|^v[^i]|^w|^xH/, c = new Set([
    "draggable",
    "spellcheck"
]), s = /["&<]/;
function l(e) {
    if (0 === e.length || !1 === s.test(e)) return e;
    for(var t = 0, n = 0, r = "", o = ""; n < e.length; n++){
        switch(e.charCodeAt(n)){
            case 34:
                o = "&quot;";
                break;
            case 38:
                o = "&amp;";
                break;
            case 60:
                o = "&lt;";
                break;
            default:
                continue;
        }
        n !== t && (r += e.slice(t, n)), r += o, t = n + 1;
    }
    return n !== t && (r += e.slice(t, n)), r;
}
var u = {}, f = new Set([
    "animation-iteration-count",
    "border-image-outset",
    "border-image-slice",
    "border-image-width",
    "box-flex",
    "box-flex-group",
    "box-ordinal-group",
    "column-count",
    "fill-opacity",
    "flex",
    "flex-grow",
    "flex-negative",
    "flex-order",
    "flex-positive",
    "flex-shrink",
    "flood-opacity",
    "font-weight",
    "grid-column",
    "grid-row",
    "line-clamp",
    "line-height",
    "opacity",
    "order",
    "orphans",
    "stop-opacity",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke-width",
    "tab-size",
    "widows",
    "z-index",
    "zoom"
]), p = /[A-Z]/g;
function h(e) {
    var t = "";
    for(var n in e){
        var r = e[n];
        if (null != r && "" !== r) {
            var o = "-" == n[0] ? n : u[n] || (u[n] = n.replace(p, "-$&").toLowerCase()), i = ";";
            "number" != typeof r || o.startsWith("--") || f.has(o) || (i = "px;"), t = t + o + ":" + r + i;
        }
    }
    return t || void 0;
}
function d() {
    this.__d = !0;
}
function _(e, t) {
    return {
        __v: e,
        context: t,
        props: e.props,
        setState: d,
        forceUpdate: d,
        __d: !0,
        __h: new Array(0)
    };
}
function v(e, t, n) {
    if (!e.s) {
        if (n instanceof m) {
            if (!n.s) return void (n.o = v.bind(null, e, t));
            1 & t && (t = n.s), n = n.v;
        }
        if (n && n.then) return void n.then(v.bind(null, e, t), v.bind(null, e, 2));
        e.s = t, e.v = n;
        const r = e.o;
        r && r(e);
    }
}
var m = /*#__PURE__*/ function() {
    function e() {}
    return e.prototype.then = function(t, n) {
        var r = new e, o = this.s;
        if (o) {
            var i = 1 & o ? t : n;
            if (i) {
                try {
                    v(r, 1, i(this.v));
                } catch (e) {
                    v(r, 2, e);
                }
                return r;
            }
            return this;
        }
        return this.o = function(e) {
            try {
                var o = e.v;
                1 & e.s ? v(r, 1, t ? t(o) : o) : n ? v(r, 1, n(o)) : v(r, 2, o);
            } catch (e) {
                v(r, 2, e);
            }
        }, r;
    }, e;
}();
function y(e) {
    return e instanceof m && 1 & e.s;
}
function g(e, t, n) {
    for(var r;;){
        var o = e();
        if (y(o) && (o = o.v), !o) return i;
        if (o.then) {
            r = 0;
            break;
        }
        var i = n();
        if (i && i.then) {
            if (!y(i)) {
                r = 1;
                break;
            }
            i = i.s;
        }
        if (t) {
            var a = t();
            if (a && a.then && !y(a)) {
                r = 2;
                break;
            }
        }
    }
    var c = new m, s = v.bind(null, c, 2);
    return (0 === r ? o.then(u) : 1 === r ? i.then(l) : a.then(f)).then(void 0, s), c;
    //TURBOPACK unreachable
    ;
    function l(r) {
        i = r;
        do {
            if (t && (a = t()) && a.then && !y(a)) return void a.then(f).then(void 0, s);
            if (!(o = e()) || y(o) && !o.v) return void v(c, 1, i);
            if (o.then) return void o.then(u).then(void 0, s);
            y(i = n()) && (i = i.v);
        }while (!i || !i.then)
        i.then(l).then(void 0, s);
    }
    function u(e) {
        e ? (i = n()) && i.then ? i.then(l).then(void 0, s) : l(i) : v(c, 1, i);
    }
    function f() {
        (o = e()) ? o.then ? o.then(u).then(void 0, s) : u(o) : v(c, 1, i);
    }
}
function b(e, t) {
    try {
        var n = e();
    } catch (e) {
        return t(!0, e);
    }
    return n && n.then ? n.then(t.bind(null, !1), t.bind(null, !0)) : t(!1, n);
}
var k, w, x, C, S = function(r, o) {
    try {
        var i = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s;
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s = !0, k = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__b, w = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].diffed, x = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__r, C = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].unmount;
        var a = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["h"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"], null);
        return a.__k = [
            r
        ], Promise.resolve(b(function() {
            return Promise.resolve(U(r, o || A, !1, void 0, a, !0, void 0)).then(function(e) {
                var t, n = function() {
                    if (E(e)) {
                        var n = function() {
                            var e = o.join(j);
                            return t = 1, e;
                        }, r = 0, o = e, i = g(function() {
                            return !!o.some(function(e) {
                                return e && "function" == typeof e.then;
                            }) && r++ < 25;
                        }, void 0, function() {
                            return Promise.resolve(Promise.all(o)).then(function(e) {
                                o = e.flat();
                            });
                        });
                        return i && i.then ? i.then(n) : n();
                    }
                }();
                return n && n.then ? n.then(function(n) {
                    return t ? n : e;
                }) : t ? n : e;
            });
        }, function(t, n) {
            if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__c && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__c(r, L), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s = i, L.length = 0, t) throw n;
            return n;
        }));
    } catch (e) {
        return Promise.reject(e);
    }
}, A = {}, L = [], E = Array.isArray, T = Object.assign, j = "";
function D(r, o, i) {
    var a = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s;
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s = !0, k = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__b, w = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].diffed, x = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__r, C = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].unmount;
    var c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["h"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"], null);
    c.__k = [
        r
    ];
    try {
        var s = U(r, o || A, !1, void 0, c, !1, i);
        return E(s) ? s.join(j) : s;
    } catch (e) {
        if (e.then) throw new Error('Use "renderToStringAsync" for suspenseful rendering.');
        throw e;
    } finally{
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__c && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__c(r, L), __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__s = a, L.length = 0;
    }
}
function P(e, t) {
    var n, r = e.type, o = !0;
    return e.__c ? (o = !1, (n = e.__c).state = n.__s) : n = new r(e.props, t), e.__c = n, n.__v = e, n.props = e.props, n.context = t, n.__d = !0, null == n.state && (n.state = A), null == n.__s && (n.__s = n.state), r.getDerivedStateFromProps ? n.state = T({}, n.state, r.getDerivedStateFromProps(n.props, n.state)) : o && n.componentWillMount ? (n.componentWillMount(), n.state = n.__s !== n.state ? n.__s : n.state) : !o && n.componentWillUpdate && n.componentWillUpdate(), x && x(e), n.render(n.props, n.state, t);
}
function U(t, s, u, f, p, d, v) {
    if (null == t || !0 === t || !1 === t || t === j) return j;
    var m = typeof t;
    if ("object" != m) return "function" == m ? j : "string" == m ? l(t) : t + j;
    if (E(t)) {
        var y, g = j;
        p.__k = t;
        for(var b = 0; b < t.length; b++){
            var S = t[b];
            if (null != S && "boolean" != typeof S) {
                var L, D = U(S, s, u, f, p, d, v);
                "string" == typeof D ? g += D : (y || (y = []), g && y.push(g), g = j, E(D) ? (L = y).push.apply(L, D) : y.push(D));
            }
        }
        return y ? (g && y.push(g), y) : g;
    }
    if (void 0 !== t.constructor) return j;
    t.__ = p, k && k(t);
    var F = t.type, M = t.props;
    if ("function" == typeof F) {
        var W, $, z, H = s;
        if (F === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"]) {
            if ("tpl" in M) {
                for(var N = j, q = 0; q < M.tpl.length; q++)if (N += M.tpl[q], M.exprs && q < M.exprs.length) {
                    var B = M.exprs[q];
                    if (null == B) continue;
                    "object" != typeof B || void 0 !== B.constructor && !E(B) ? N += B : N += U(B, s, u, f, t, d, v);
                }
                return N;
            }
            if ("UNSTABLE_comment" in M) return "\x3c!--" + l(M.UNSTABLE_comment) + "--\x3e";
            $ = M.children;
        } else {
            if (null != (W = F.contextType)) {
                var I = s[W.__c];
                H = I ? I.props.value : W.__;
            }
            var O = F.prototype && "function" == typeof F.prototype.render;
            if (O) $ = P(t, H), z = t.__c;
            else {
                t.__c = z = _(t, H);
                for(var R = 0; z.__d && R++ < 25;)z.__d = !1, x && x(t), $ = F.call(z, M, H);
                z.__d = !0;
            }
            if (null != z.getChildContext && (s = T({}, s, z.getChildContext())), O && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].errorBoundaries && (F.getDerivedStateFromError || z.componentDidCatch)) {
                $ = null != $ && $.type === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"] && null == $.key && null == $.props.tpl ? $.props.children : $;
                try {
                    return U($, s, u, f, t, d, v);
                } catch (e) {
                    return F.getDerivedStateFromError && (z.__s = F.getDerivedStateFromError(e)), z.componentDidCatch && z.componentDidCatch(e, A), z.__d ? ($ = P(t, s), null != (z = t.__c).getChildContext && (s = T({}, s, z.getChildContext())), U($ = null != $ && $.type === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"] && null == $.key && null == $.props.tpl ? $.props.children : $, s, u, f, t, d, v)) : j;
                } finally{
                    w && w(t), t.__ = null, C && C(t);
                }
            }
        }
        $ = null != $ && $.type === __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"] && null == $.key && null == $.props.tpl ? $.props.children : $;
        try {
            var V = U($, s, u, f, t, d, v);
            return w && w(t), t.__ = null, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].unmount && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].unmount(t), V;
        } catch (n) {
            if (!d && v && v.onError) {
                var K = v.onError(n, t, function(e) {
                    return U(e, s, u, f, t, d, v);
                });
                if (void 0 !== K) return K;
                var G = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].__e;
                return G && G(n, t), j;
            }
            if (!d) throw n;
            if (!n || "function" != typeof n.then) throw n;
            return n.then(function e() {
                try {
                    return U($, s, u, f, t, d, v);
                } catch (n) {
                    if (!n || "function" != typeof n.then) throw n;
                    return n.then(function() {
                        return U($, s, u, f, t, d, v);
                    }, e);
                }
            });
        }
    }
    var J, Q = "<" + F, X = j;
    for(var Y in M){
        var ee = M[Y];
        if ("function" != typeof ee || "class" === Y || "className" === Y) {
            switch(Y){
                case "children":
                    J = ee;
                    continue;
                case "key":
                case "ref":
                case "__self":
                case "__source":
                    continue;
                case "htmlFor":
                    if ("for" in M) continue;
                    Y = "for";
                    break;
                case "className":
                    if ("class" in M) continue;
                    Y = "class";
                    break;
                case "defaultChecked":
                    Y = "checked";
                    break;
                case "defaultSelected":
                    Y = "selected";
                    break;
                case "defaultValue":
                case "value":
                    switch(Y = "value", F){
                        case "textarea":
                            J = ee;
                            continue;
                        case "select":
                            f = ee;
                            continue;
                        case "option":
                            f != ee || "selected" in M || (Q += " selected");
                    }
                    break;
                case "dangerouslySetInnerHTML":
                    X = ee && ee.__html;
                    continue;
                case "style":
                    "object" == typeof ee && (ee = h(ee));
                    break;
                case "acceptCharset":
                    Y = "accept-charset";
                    break;
                case "httpEquiv":
                    Y = "http-equiv";
                    break;
                default:
                    if (o.test(Y)) Y = Y.replace(o, "$1:$2").toLowerCase();
                    else {
                        if (r.test(Y)) continue;
                        "-" !== Y[4] && !c.has(Y) || null == ee ? u ? a.test(Y) && (Y = "panose1" === Y ? "panose-1" : Y.replace(/([A-Z])/g, "-$1").toLowerCase()) : i.test(Y) && (Y = Y.toLowerCase()) : ee += j;
                    }
            }
            null != ee && !1 !== ee && (Q = !0 === ee || ee === j ? Q + " " + Y : Q + " " + Y + '="' + ("string" == typeof ee ? l(ee) : ee + j) + '"');
        }
    }
    if (r.test(F)) throw new Error(F + " is not a valid HTML tag name in " + Q + ">");
    if (X || ("string" == typeof J ? X = l(J) : null != J && !1 !== J && !0 !== J && (X = U(J, s, "svg" === F || "foreignObject" !== F && u, f, t, d, v))), w && w(t), t.__ = null, C && C(t), !X && Z.has(F)) return Q + "/>";
    var te = "</" + F + ">", ne = Q + ">";
    return E(X) ? [
        ne
    ].concat(X, [
        te
    ]) : "string" != typeof X ? [
        ne,
        X,
        te
    ] : ne + X + te;
}
var Z = new Set([
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
]), F = D, M = D;
const __TURBOPACK__default__export__ = D;
;
}),
"[project]/node_modules/preact/dist/preact.mjs [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Component",
    ()=>k,
    "Fragment",
    ()=>b,
    "cloneElement",
    ()=>E,
    "createContext",
    ()=>G,
    "createElement",
    ()=>_,
    "createRef",
    ()=>m,
    "h",
    ()=>_,
    "hydrate",
    ()=>D,
    "isValidElement",
    ()=>t,
    "options",
    ()=>l,
    "render",
    ()=>B,
    "toChildArray",
    ()=>H
]);
var n, l, u, t, i, o, r, f, e, c, s, a, h = {}, v = [], p = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, y = Array.isArray;
function d(n, l) {
    for(var u in l)n[u] = l[u];
    return n;
}
function w(n) {
    n && n.parentNode && n.parentNode.removeChild(n);
}
function _(l, u, t) {
    var i, o, r, f = {};
    for(r in u)"key" == r ? i = u[r] : "ref" == r ? o = u[r] : f[r] = u[r];
    if (arguments.length > 2 && (f.children = arguments.length > 3 ? n.call(arguments, 2) : t), "function" == typeof l && null != l.defaultProps) for(r in l.defaultProps)void 0 === f[r] && (f[r] = l.defaultProps[r]);
    return g(l, f, i, o, null);
}
function g(n, t, i, o, r) {
    var f = {
        type: n,
        props: t,
        key: i,
        ref: o,
        __k: null,
        __: null,
        __b: 0,
        __e: null,
        __d: void 0,
        __c: null,
        constructor: void 0,
        __v: null == r ? ++u : r,
        __i: -1,
        __u: 0
    };
    return null == r && null != l.vnode && l.vnode(f), f;
}
function m() {
    return {
        current: null
    };
}
function b(n) {
    return n.children;
}
function k(n, l) {
    this.props = n, this.context = l;
}
function x(n, l) {
    if (null == l) return n.__ ? x(n.__, n.__i + 1) : null;
    for(var u; l < n.__k.length; l++)if (null != (u = n.__k[l]) && null != u.__e) return u.__e;
    return "function" == typeof n.type ? x(n) : null;
}
function C(n) {
    var l, u;
    if (null != (n = n.__) && null != n.__c) {
        for(n.__e = n.__c.base = null, l = 0; l < n.__k.length; l++)if (null != (u = n.__k[l]) && null != u.__e) {
            n.__e = n.__c.base = u.__e;
            break;
        }
        return C(n);
    }
}
function S(n) {
    (!n.__d && (n.__d = !0) && i.push(n) && !M.__r++ || o !== l.debounceRendering) && ((o = l.debounceRendering) || r)(M);
}
function M() {
    var n, u, t, o, r, e, c, s;
    for(i.sort(f); n = i.shift();)n.__d && (u = i.length, o = void 0, e = (r = (t = n).__v).__e, c = [], s = [], t.__P && ((o = d({}, r)).__v = r.__v + 1, l.vnode && l.vnode(o), O(t.__P, o, r, t.__n, t.__P.namespaceURI, 32 & r.__u ? [
        e
    ] : null, c, null == e ? x(r) : e, !!(32 & r.__u), s), o.__v = r.__v, o.__.__k[o.__i] = o, j(c, o, s), o.__e != e && C(o)), i.length > u && i.sort(f));
    M.__r = 0;
}
function P(n, l, u, t, i, o, r, f, e, c, s) {
    var a, p, y, d, w, _ = t && t.__k || v, g = l.length;
    for(u.__d = e, $(u, l, _), e = u.__d, a = 0; a < g; a++)null != (y = u.__k[a]) && (p = -1 === y.__i ? h : _[y.__i] || h, y.__i = a, O(n, y, p, i, o, r, f, e, c, s), d = y.__e, y.ref && p.ref != y.ref && (p.ref && N(p.ref, null, y), s.push(y.ref, y.__c || d, y)), null == w && null != d && (w = d), 65536 & y.__u || p.__k === y.__k ? e = I(y, e, n) : "function" == typeof y.type && void 0 !== y.__d ? e = y.__d : d && (e = d.nextSibling), y.__d = void 0, y.__u &= -196609);
    u.__d = e, u.__e = w;
}
function $(n, l, u) {
    var t, i, o, r, f, e = l.length, c = u.length, s = c, a = 0;
    for(n.__k = [], t = 0; t < e; t++)null != (i = l[t]) && "boolean" != typeof i && "function" != typeof i ? (r = t + a, (i = n.__k[t] = "string" == typeof i || "number" == typeof i || "bigint" == typeof i || i.constructor == String ? g(null, i, null, null, null) : y(i) ? g(b, {
        children: i
    }, null, null, null) : void 0 === i.constructor && i.__b > 0 ? g(i.type, i.props, i.key, i.ref ? i.ref : null, i.__v) : i).__ = n, i.__b = n.__b + 1, o = null, -1 !== (f = i.__i = L(i, u, r, s)) && (s--, (o = u[f]) && (o.__u |= 131072)), null == o || null === o.__v ? (-1 == f && a--, "function" != typeof i.type && (i.__u |= 65536)) : f !== r && (f == r - 1 ? a-- : f == r + 1 ? a++ : (f > r ? a-- : a++, i.__u |= 65536))) : i = n.__k[t] = null;
    if (s) for(t = 0; t < c; t++)null != (o = u[t]) && 0 == (131072 & o.__u) && (o.__e == n.__d && (n.__d = x(o)), V(o, o));
}
function I(n, l, u) {
    var t, i;
    if ("function" == typeof n.type) {
        for(t = n.__k, i = 0; t && i < t.length; i++)t[i] && (t[i].__ = n, l = I(t[i], l, u));
        return l;
    }
    n.__e != l && (l && n.type && !u.contains(l) && (l = x(n)), u.insertBefore(n.__e, l || null), l = n.__e);
    do {
        l = l && l.nextSibling;
    }while (null != l && 8 === l.nodeType)
    return l;
}
function H(n, l) {
    return l = l || [], null == n || "boolean" == typeof n || (y(n) ? n.some(function(n) {
        H(n, l);
    }) : l.push(n)), l;
}
function L(n, l, u, t) {
    var i = n.key, o = n.type, r = u - 1, f = u + 1, e = l[u];
    if (null === e || e && i == e.key && o === e.type && 0 == (131072 & e.__u)) return u;
    if (t > (null != e && 0 == (131072 & e.__u) ? 1 : 0)) for(; r >= 0 || f < l.length;){
        if (r >= 0) {
            if ((e = l[r]) && 0 == (131072 & e.__u) && i == e.key && o === e.type) return r;
            r--;
        }
        if (f < l.length) {
            if ((e = l[f]) && 0 == (131072 & e.__u) && i == e.key && o === e.type) return f;
            f++;
        }
    }
    return -1;
}
function T(n, l, u) {
    "-" === l[0] ? n.setProperty(l, null == u ? "" : u) : n[l] = null == u ? "" : "number" != typeof u || p.test(l) ? u : u + "px";
}
function A(n, l, u, t, i) {
    var o;
    n: if ("style" === l) if ("string" == typeof u) n.style.cssText = u;
    else {
        if ("string" == typeof t && (n.style.cssText = t = ""), t) for(l in t)u && l in u || T(n.style, l, "");
        if (u) for(l in u)t && u[l] === t[l] || T(n.style, l, u[l]);
    }
    else if ("o" === l[0] && "n" === l[1]) o = l !== (l = l.replace(/(PointerCapture)$|Capture$/i, "$1")), l = l.toLowerCase() in n || "onFocusOut" === l || "onFocusIn" === l ? l.toLowerCase().slice(2) : l.slice(2), n.l || (n.l = {}), n.l[l + o] = u, u ? t ? u.u = t.u : (u.u = e, n.addEventListener(l, o ? s : c, o)) : n.removeEventListener(l, o ? s : c, o);
    else {
        if ("http://www.w3.org/2000/svg" == i) l = l.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
        else if ("width" != l && "height" != l && "href" != l && "list" != l && "form" != l && "tabIndex" != l && "download" != l && "rowSpan" != l && "colSpan" != l && "role" != l && "popover" != l && l in n) try {
            n[l] = null == u ? "" : u;
            break n;
        } catch (n) {}
        "function" == typeof u || (null == u || !1 === u && "-" !== l[4] ? n.removeAttribute(l) : n.setAttribute(l, "popover" == l && 1 == u ? "" : u));
    }
}
function F(n) {
    return function(u) {
        if (this.l) {
            var t = this.l[u.type + n];
            if (null == u.t) u.t = e++;
            else if (u.t < t.u) return;
            return t(l.event ? l.event(u) : u);
        }
    };
}
function O(n, u, t, i, o, r, f, e, c, s) {
    var a, h, v, p, w, _, g, m, x, C, S, M, $, I, H, L, T = u.type;
    if (void 0 !== u.constructor) return null;
    128 & t.__u && (c = !!(32 & t.__u), r = [
        e = u.__e = t.__e
    ]), (a = l.__b) && a(u);
    n: if ("function" == typeof T) try {
        if (m = u.props, x = "prototype" in T && T.prototype.render, C = (a = T.contextType) && i[a.__c], S = a ? C ? C.props.value : a.__ : i, t.__c ? g = (h = u.__c = t.__c).__ = h.__E : (x ? u.__c = h = new T(m, S) : (u.__c = h = new k(m, S), h.constructor = T, h.render = q), C && C.sub(h), h.props = m, h.state || (h.state = {}), h.context = S, h.__n = i, v = h.__d = !0, h.__h = [], h._sb = []), x && null == h.__s && (h.__s = h.state), x && null != T.getDerivedStateFromProps && (h.__s == h.state && (h.__s = d({}, h.__s)), d(h.__s, T.getDerivedStateFromProps(m, h.__s))), p = h.props, w = h.state, h.__v = u, v) x && null == T.getDerivedStateFromProps && null != h.componentWillMount && h.componentWillMount(), x && null != h.componentDidMount && h.__h.push(h.componentDidMount);
        else {
            if (x && null == T.getDerivedStateFromProps && m !== p && null != h.componentWillReceiveProps && h.componentWillReceiveProps(m, S), !h.__e && (null != h.shouldComponentUpdate && !1 === h.shouldComponentUpdate(m, h.__s, S) || u.__v === t.__v)) {
                for(u.__v !== t.__v && (h.props = m, h.state = h.__s, h.__d = !1), u.__e = t.__e, u.__k = t.__k, u.__k.some(function(n) {
                    n && (n.__ = u);
                }), M = 0; M < h._sb.length; M++)h.__h.push(h._sb[M]);
                h._sb = [], h.__h.length && f.push(h);
                break n;
            }
            null != h.componentWillUpdate && h.componentWillUpdate(m, h.__s, S), x && null != h.componentDidUpdate && h.__h.push(function() {
                h.componentDidUpdate(p, w, _);
            });
        }
        if (h.context = S, h.props = m, h.__P = n, h.__e = !1, $ = l.__r, I = 0, x) {
            for(h.state = h.__s, h.__d = !1, $ && $(u), a = h.render(h.props, h.state, h.context), H = 0; H < h._sb.length; H++)h.__h.push(h._sb[H]);
            h._sb = [];
        } else do {
            h.__d = !1, $ && $(u), a = h.render(h.props, h.state, h.context), h.state = h.__s;
        }while (h.__d && ++I < 25)
        h.state = h.__s, null != h.getChildContext && (i = d(d({}, i), h.getChildContext())), x && !v && null != h.getSnapshotBeforeUpdate && (_ = h.getSnapshotBeforeUpdate(p, w)), P(n, y(L = null != a && a.type === b && null == a.key ? a.props.children : a) ? L : [
            L
        ], u, t, i, o, r, f, e, c, s), h.base = u.__e, u.__u &= -161, h.__h.length && f.push(h), g && (h.__E = h.__ = null);
    } catch (n) {
        if (u.__v = null, c || null != r) {
            for(u.__u |= c ? 160 : 128; e && 8 === e.nodeType && e.nextSibling;)e = e.nextSibling;
            r[r.indexOf(e)] = null, u.__e = e;
        } else u.__e = t.__e, u.__k = t.__k;
        l.__e(n, u, t);
    }
    else null == r && u.__v === t.__v ? (u.__k = t.__k, u.__e = t.__e) : u.__e = z(t.__e, u, t, i, o, r, f, c, s);
    (a = l.diffed) && a(u);
}
function j(n, u, t) {
    u.__d = void 0;
    for(var i = 0; i < t.length; i++)N(t[i], t[++i], t[++i]);
    l.__c && l.__c(u, n), n.some(function(u) {
        try {
            n = u.__h, u.__h = [], n.some(function(n) {
                n.call(u);
            });
        } catch (n) {
            l.__e(n, u.__v);
        }
    });
}
function z(u, t, i, o, r, f, e, c, s) {
    var a, v, p, d, _, g, m, b = i.props, k = t.props, C = t.type;
    if ("svg" === C ? r = "http://www.w3.org/2000/svg" : "math" === C ? r = "http://www.w3.org/1998/Math/MathML" : r || (r = "http://www.w3.org/1999/xhtml"), null != f) {
        for(a = 0; a < f.length; a++)if ((_ = f[a]) && "setAttribute" in _ == !!C && (C ? _.localName === C : 3 === _.nodeType)) {
            u = _, f[a] = null;
            break;
        }
    }
    if (null == u) {
        if (null === C) return document.createTextNode(k);
        u = document.createElementNS(r, C, k.is && k), c && (l.__m && l.__m(t, f), c = !1), f = null;
    }
    if (null === C) b === k || c && u.data === k || (u.data = k);
    else {
        if (f = f && n.call(u.childNodes), b = i.props || h, !c && null != f) for(b = {}, a = 0; a < u.attributes.length; a++)b[(_ = u.attributes[a]).name] = _.value;
        for(a in b)if (_ = b[a], "children" == a) ;
        else if ("dangerouslySetInnerHTML" == a) p = _;
        else if (!(a in k)) {
            if ("value" == a && "defaultValue" in k || "checked" == a && "defaultChecked" in k) continue;
            A(u, a, null, _, r);
        }
        for(a in k)_ = k[a], "children" == a ? d = _ : "dangerouslySetInnerHTML" == a ? v = _ : "value" == a ? g = _ : "checked" == a ? m = _ : c && "function" != typeof _ || b[a] === _ || A(u, a, _, b[a], r);
        if (v) c || p && (v.__html === p.__html || v.__html === u.innerHTML) || (u.innerHTML = v.__html), t.__k = [];
        else if (p && (u.innerHTML = ""), P(u, y(d) ? d : [
            d
        ], t, i, o, "foreignObject" === C ? "http://www.w3.org/1999/xhtml" : r, f, e, f ? f[0] : i.__k && x(i, 0), c, s), null != f) for(a = f.length; a--;)w(f[a]);
        c || (a = "value", "progress" === C && null == g ? u.removeAttribute("value") : void 0 !== g && (g !== u[a] || "progress" === C && !g || "option" === C && g !== b[a]) && A(u, a, g, b[a], r), a = "checked", void 0 !== m && m !== u[a] && A(u, a, m, b[a], r));
    }
    return u;
}
function N(n, u, t) {
    try {
        if ("function" == typeof n) {
            var i = "function" == typeof n.__u;
            i && n.__u(), i && null == u || (n.__u = n(u));
        } else n.current = u;
    } catch (n) {
        l.__e(n, t);
    }
}
function V(n, u, t) {
    var i, o;
    if (l.unmount && l.unmount(n), (i = n.ref) && (i.current && i.current !== n.__e || N(i, null, u)), null != (i = n.__c)) {
        if (i.componentWillUnmount) try {
            i.componentWillUnmount();
        } catch (n) {
            l.__e(n, u);
        }
        i.base = i.__P = null;
    }
    if (i = n.__k) for(o = 0; o < i.length; o++)i[o] && V(i[o], u, t || "function" != typeof n.type);
    t || w(n.__e), n.__c = n.__ = n.__e = n.__d = void 0;
}
function q(n, l, u) {
    return this.constructor(n, u);
}
function B(u, t, i) {
    var o, r, f, e;
    l.__ && l.__(u, t), r = (o = "function" == typeof i) ? null : i && i.__k || t.__k, f = [], e = [], O(t, u = (!o && i || t).__k = _(b, null, [
        u
    ]), r || h, h, t.namespaceURI, !o && i ? [
        i
    ] : r ? null : t.firstChild ? n.call(t.childNodes) : null, f, !o && i ? i : r ? r.__e : t.firstChild, o, e), j(f, u, e);
}
function D(n, l) {
    B(n, l, D);
}
function E(l, u, t) {
    var i, o, r, f, e = d({}, l.props);
    for(r in l.type && l.type.defaultProps && (f = l.type.defaultProps), u)"key" == r ? i = u[r] : "ref" == r ? o = u[r] : e[r] = void 0 === u[r] && void 0 !== f ? f[r] : u[r];
    return arguments.length > 2 && (e.children = arguments.length > 3 ? n.call(arguments, 2) : t), g(l.type, e, i || l.key, o || l.ref, null);
}
function G(n, l) {
    var u = {
        __c: l = "__cC" + a++,
        __: n,
        Consumer: function(n, l) {
            return n.children(l);
        },
        Provider: function(n) {
            var u, t;
            return this.getChildContext || (u = new Set, (t = {})[l] = this, this.getChildContext = function() {
                return t;
            }, this.componentWillUnmount = function() {
                u = null;
            }, this.shouldComponentUpdate = function(n) {
                this.props.value !== n.value && u.forEach(function(n) {
                    n.__e = !0, S(n);
                });
            }, this.sub = function(n) {
                u.add(n);
                var l = n.componentWillUnmount;
                n.componentWillUnmount = function() {
                    u && u.delete(n), l && l.call(n);
                };
            }), n.children;
        }
    };
    return u.Provider.__ = u.Consumer.contextType = u;
}
n = v.slice, l = {
    __e: function(n, l, u, t) {
        for(var i, o, r; l = l.__;)if ((i = l.__c) && !i.__) try {
            if ((o = i.constructor) && null != o.getDerivedStateFromError && (i.setState(o.getDerivedStateFromError(n)), r = i.__d), null != i.componentDidCatch && (i.componentDidCatch(n, t || {}), r = i.__d), r) return i.__E = i;
        } catch (l) {
            n = l;
        }
        throw n;
    }
}, u = 0, t = function(n) {
    return null != n && null == n.constructor;
}, k.prototype.setState = function(n, l) {
    var u;
    u = null != this.__s && this.__s !== this.state ? this.__s : this.__s = d({}, this.state), "function" == typeof n && (n = n(d({}, u), this.props)), n && d(u, n), null != n && this.__v && (l && this._sb.push(l), S(this));
}, k.prototype.forceUpdate = function(n) {
    this.__v && (this.__e = !0, n && this.__h.push(n), S(this));
}, k.prototype.render = b, i = [], r = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, f = function(n, l) {
    return n.__v.__b - l.__v.__b;
}, M.__r = 0, e = 0, c = F(!1), s = F(!0), a = 0;
;
}),
"[project]/node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs [app-route] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "jsx",
    ()=>u,
    "jsxAttr",
    ()=>p,
    "jsxDEV",
    ()=>u,
    "jsxEscape",
    ()=>_,
    "jsxTemplate",
    ()=>a,
    "jsxs",
    ()=>u
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/preact/dist/preact.mjs [app-route] (ecmascript)");
;
;
var t = /["&<]/;
function n(r) {
    if (0 === r.length || !1 === t.test(r)) return r;
    for(var e = 0, n = 0, o = "", f = ""; n < r.length; n++){
        switch(r.charCodeAt(n)){
            case 34:
                f = "&quot;";
                break;
            case 38:
                f = "&amp;";
                break;
            case 60:
                f = "&lt;";
                break;
            default:
                continue;
        }
        n !== e && (o += r.slice(e, n)), o += f, e = n + 1;
    }
    return n !== e && (o += r.slice(e, n)), o;
}
var o = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i, f = 0, i = Array.isArray;
function u(e, t, n, o, i, u) {
    t || (t = {});
    var a, c, l = t;
    "ref" in t && (a = t.ref, delete t.ref);
    var p = {
        type: e,
        props: l,
        key: n,
        ref: a,
        __k: null,
        __: null,
        __b: 0,
        __e: null,
        __d: void 0,
        __c: null,
        constructor: void 0,
        __v: --f,
        __i: -1,
        __u: 0,
        __source: i,
        __self: u
    };
    if ("function" == typeof e && (a = e.defaultProps)) for(c in a)void 0 === l[c] && (l[c] = a[c]);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].vnode && __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].vnode(p), p;
}
function a(r) {
    var t = u(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Fragment"], {
        tpl: r,
        exprs: [].slice.call(arguments, 1)
    });
    return t.key = t.__v, t;
}
var c = {}, l = /[A-Z]/g;
function p(e, t) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].attr) {
        var f = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$preact$2f$dist$2f$preact$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["options"].attr(e, t);
        if ("string" == typeof f) return f;
    }
    if ("ref" === e || "key" === e) return "";
    if ("style" === e && "object" == typeof t) {
        var i = "";
        for(var u in t){
            var a = t[u];
            if (null != a && "" !== a) {
                var p = "-" == u[0] ? u : c[u] || (c[u] = u.replace(l, "-$&").toLowerCase()), _ = ";";
                "number" != typeof a || p.startsWith("--") || o.test(p) || (_ = "px;"), i = i + p + ":" + a + _;
            }
        }
        return e + '="' + i + '"';
    }
    return null == t || !1 === t || "function" == typeof t || "object" == typeof t ? "" : !0 === t ? e : e + '="' + n(t) + '"';
}
function _(r) {
    if (null == r || "boolean" == typeof r || "function" == typeof r) return null;
    if ("object" == typeof r) {
        if (void 0 === r.constructor) return r;
        if (i(r)) {
            for(var e = 0; e < r.length; e++)r[e] = _(r[e]);
            return r;
        }
    }
    return n("" + r);
}
;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1qsbv59._.js.map