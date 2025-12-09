/**
 * Mermaid syntax parser
 */

import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export enum ParseStatus {
	SUCCESS,
	FAIL,
}

export interface ParseResult {
	status: ParseStatus;
	message?: string;
}

/**
 * Filter redundant information from error output
 */
const filterErrorOutput = (errorOutput: string): string => {
	if (!errorOutput || typeof errorOutput !== "string") {
		return "";
	}

	// Remove npm warnings
	const filtered = errorOutput.replace(/npm warn[^\n]*\n/gi, "");
	const lines = filtered.split("\n");
	const filteredLines: string[] = [];
	let foundError = false;

	for (const line of lines) {
		const trimmed = line.trim();

		// Skip empty lines and npm warnings
		if (!trimmed || trimmed.toLowerCase().includes("npm warn")) continue;

		// Stop at stack trace lines
		if (trimmed.startsWith("at ") || trimmed.startsWith("at async")) break;

		// Capture error messages
		if (trimmed.startsWith("Error:") || foundError) {
			foundError = true;
			filteredLines.push(line);
		}
	}

	const result =
		filteredLines.length > 0
			? filteredLines.join("\n").trim()
			: errorOutput.trim();

	return result || "Unknown parsing error";
};

/**
 * Parse Mermaid diagram syntax
 * @param inputFile Input file name
 * @param outputFile Output file name
 * @returns Parse result
 */
export const parseMermaid = (
	inputFile: string = "input.mmd",
	outputFile: string = "output.svg",
): Promise<ParseResult> => {
	return new Promise((resolve) => {
		const inputPath = path.join(__dirname, inputFile);
		const outputPath = path.join(__dirname, outputFile);

		exec(
			`npx mmdc -i ${inputPath} -o ${outputPath}`,
			(err, _stdout, stderr) => {
				if (err) {
					const errorOutput = stderr || err.message || "";
					const filteredMessage = filterErrorOutput(errorOutput);
					resolve({
						status: ParseStatus.FAIL,
						message: filteredMessage || err.message || "Unknown error",
					});
					return;
				}

				resolve({ status: ParseStatus.SUCCESS });
			},
		);
	});
};
