/**
 * Mermaid syntax checker
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ParseResult, ParseStatus, parseMermaid } from "./parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Check Mermaid diagram syntax
 * @param text Mermaid syntax text
 * @returns Check result
 */
export const checkMermaid = async (text: string): Promise<ParseResult> => {
	// Input validation
	if (typeof text !== "string") {
		return {
			status: ParseStatus.FAIL,
			message: "Input must be a string",
		};
	}

	// Check for empty or whitespace-only content
	if (!text.trim()) {
		return {
			status: ParseStatus.FAIL,
			message: "Input cannot be empty or contain only whitespace",
		};
	}

	const inputFilePath = path.join(__dirname, "input.mmd");

	try {
		fs.writeFileSync(inputFilePath, text, { encoding: "utf-8" });
		return await parseMermaid();
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "File write failed";
		return {
			status: ParseStatus.FAIL,
			message: `Unable to write temporary file: ${errorMessage}`,
		};
	}
};
