#!/usr/bin/env node

/**
 * Mermaid Grammar Inspector MCP Server
 * Provides Mermaid diagram syntax checking service
 */

import { program } from "commander";
import { FastMCP } from "fastmcp";
import { z } from "zod";
import pkg from "../package.json";
import { checkMermaid } from "./check";
import { ParseStatus } from "./parse";

/**
 * Start MCP server
 */
export const main = () => {
	program.name(pkg.name).description(pkg.description).version(pkg.version);

	program
		.option("--http", "Use HTTP transport mode")
		.option("-p, --port <number>", "HTTP server port", "3000")
		.parse();

	const { http, port } = program.opts();
	const [major, minor, patch] = pkg.version.split(".").map(Number);

	const server = new FastMCP({
		name: pkg.mcpName,
		version: `${major}.${minor}.${patch}`,
	});

	server.addTool({
		name: "check",
		description:
			"Check if the text is a valid mermaid diagram. Returns an empty string if valid, otherwise returns the error message.",
		parameters: z.object({
			text: z.string(),
		}),
		execute: async (args) => {
			try {
				const { status, message } = await checkMermaid(args.text);
				return status === ParseStatus.SUCCESS ? "" : message || "Unknown error";
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unexpected error occurred";
				console.error("Error in check tool:", errorMessage);
				return `Internal error: ${errorMessage}`;
			}
		},
	});

	if (http) {
		const portNum = parseInt(port, 10) || 3000;
		server.start({
			transportType: "httpStream",
			httpStream: { host: "0.0.0.0", port: portNum },
		});
		console.log(`🚀 MCP Server started (HTTP mode) - Port: ${portNum}`);
	} else {
		server.start({ transportType: "stdio" });
	}
};

main();
