// src/pages/api/gst-credentials.js
// This is an alias endpoint that forwards requests to the main credentials endpoint
import credentialsHandler from './gst/credentials';

export default credentialsHandler;