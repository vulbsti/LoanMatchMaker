"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLenderRow = isLenderRow;
exports.isConversationRow = isConversationRow;
exports.isSessionRow = isSessionRow;
exports.isParameterTrackingRow = isParameterTrackingRow;
exports.isLoanParametersRow = isLoanParametersRow;
function isLenderRow(row) {
    return typeof row === 'object' && row !== null &&
        'id' in row && 'name' in row && 'interest_rate' in row;
}
function isConversationRow(row) {
    return typeof row === 'object' && row !== null &&
        'id' in row && 'session_id' in row && 'message_type' in row;
}
function isSessionRow(row) {
    return typeof row === 'object' && row !== null &&
        'id' in row && 'created_at' in row && 'status' in row;
}
function isParameterTrackingRow(row) {
    return typeof row === 'object' && row !== null &&
        'session_id' in row && 'completion_percentage' in row;
}
function isLoanParametersRow(row) {
    return typeof row === 'object' && row !== null &&
        'session_id' in row;
}
//# sourceMappingURL=database-types.js.map