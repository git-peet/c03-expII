// Context assembly tool - generic CLI/utility interface for assembling bounded context
// Wraps assembleContext and validateContext for external use

import { assembleContext, validateContext } from "./context-assembly.mjs";

/**
 * Assemble bounded context from project source modules.
 * Uses generic relative path "src" by default.
 * 
 * @param {Object} options - assembly options
 * @returns {Promise<Object>} assembled context
 */
export async function assembleContextTool(options = {}) {
  return assembleContext(options);
}

/**
 * Validate assembled context against generic policy constraints.
 * 
 * @param {Object} context - context to validate
 * @returns {Promise<Object>} validation result { valid: boolean, errors: [] }
 */
export async function validateContextTool(context) {
  return validateContext(context);
}

/**
 * Main entry point for context assembly tool.
 * Can be used as a command-line tool or library.
 */
export default {
  assembleContextTool,
  validateContextTool
};