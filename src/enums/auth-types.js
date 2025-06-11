/**
 * Copyright (c) 2025 CareSyncRx
 * MIT License
 * 
 * Authentication enumerations for the CareSyncRx platform.
 */

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TwoFactorMethod = exports.LoginStatus = exports.AuthEventType = exports.TokenType = void 0;

/**
 * Types of tokens used in the authentication system
 */
var TokenType;
(function (TokenType) {
    TokenType["ACCESS"] = "ACCESS";
    TokenType["REFRESH"] = "REFRESH";
    TokenType["TEMP"] = "TEMP";
})(TokenType = exports.TokenType || (exports.TokenType = {}));

/**
 * Authentication event types for auditing and logging
 */
var AuthEventType;
(function (AuthEventType) {
    AuthEventType["LOGIN"] = "LOGIN";
    AuthEventType["LOGOUT"] = "LOGOUT";
    AuthEventType["REGISTER"] = "REGISTER";
    AuthEventType["PASSWORD_RESET"] = "PASSWORD_RESET";
    AuthEventType["PASSWORD_CHANGE"] = "PASSWORD_CHANGE";
    AuthEventType["TWO_FACTOR_SETUP"] = "TWO_FACTOR_SETUP";
    AuthEventType["TWO_FACTOR_VERIFY"] = "TWO_FACTOR_VERIFY";
    AuthEventType["ACCOUNT_LOCK"] = "ACCOUNT_LOCK";
    AuthEventType["ACCOUNT_UNLOCK"] = "ACCOUNT_UNLOCK";
    AuthEventType["TOKEN_REFRESH"] = "TOKEN_REFRESH";
})(AuthEventType = exports.AuthEventType || (exports.AuthEventType = {}));

/**
 * Login status codes returned from authentication attempts
 */
var LoginStatus;
(function (LoginStatus) {
    LoginStatus["SUCCESS"] = "SUCCESS";
    LoginStatus["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    LoginStatus["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    LoginStatus["REQUIRES_2FA"] = "REQUIRES_2FA";
    LoginStatus["ACCOUNT_DISABLED"] = "ACCOUNT_DISABLED";
    LoginStatus["PASSWORD_EXPIRED"] = "PASSWORD_EXPIRED";
})(LoginStatus = exports.LoginStatus || (exports.LoginStatus = {}));

/**
 * Two-factor authentication methods
 */
var TwoFactorMethod;
(function (TwoFactorMethod) {
    TwoFactorMethod["TOTP"] = "TOTP";
    TwoFactorMethod["SMS"] = "SMS";
    TwoFactorMethod["EMAIL"] = "EMAIL";
    TwoFactorMethod["BACKUP_CODE"] = "BACKUP_CODE";
})(TwoFactorMethod = exports.TwoFactorMethod || (exports.TwoFactorMethod = {}));

exports.default = {
    TokenType,
    AuthEventType,
    LoginStatus,
    TwoFactorMethod
};
