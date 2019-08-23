import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import pkg from "./package.json";

export default [
    {
        input: "src/main.js",
        output: {
            file: pkg.browser,
            name: "busstore",
            format: "umd",
            globals: {
                react: "React",
            },
        },
        plugins: [
            resolve({
                moduleDirectory: "node_modules",
            }),
            commonjs({
                moduleDirectory: "node_modules",
            }),
        ],
        external: ["react", "react-dom", "uuid"],
        
    },
    {
        input: "src/main.js",
        external: ["react", "react-dom", "uuid"],
        plugins: [
            resolve(),
            commonjs(),
        ],
        output: [{ file: pkg.main, format: "cjs" }, { file: pkg.module, format: "es" }],
    },
];
