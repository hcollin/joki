import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";
import external from "rollup-plugin-peer-deps-external";
import pkg from "./package.json";

export default [
    {
        input: "src/main.js",
        output: {
            file: pkg.browser,
            name: "busstore",
            format: "umd",
        },
        plugins: [
            external({
                includeDependencies: false,
            }),
            resolve({
                moduleDirectory: "node_modules",
            }),
            babel({
                plugins: [
                    "@babel/plugin-proposal-object-rest-spread",
                    "@babel/plugin-proposal-optional-chaining",
                    "@babel/plugin-syntax-dynamic-import",
                    "@babel/plugin-proposal-class-properties",
                    "transform-react-remove-prop-types",
                ],
                exclude: "node_modules/**", // only transpile our source code
            }),
            commonjs({
                moduleDirectory: "node_modules",
            }),
        ],
        external: ["react", "react-dom", "uuid"],
        globals: {
            react: "React",
        },
    },
    {
        input: "src/main.js",
        external: ["react", "react-dom", "uuid"],
        plugins: [resolve(), commonjs()],
        output: [{ file: pkg.main, format: "cjs" }, { file: pkg.module, format: "es" }],
    },
];
