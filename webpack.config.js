const path = require( "path" );
const ExtractTextPlugin = require( "extract-text-webpack-plugin" );
const plugins = [
    new ExtractTextPlugin( {
        filename: "[name].bundle.css",
        allChunks: true,
    } )
];


module.exports = {
    context: path.resolve( __dirname, "src" ),

    entry: {
        dashboard: "./dashboard/index.js",
    },

    output: {
        path: path.resolve( __dirname, "public/js" ),
        filename: "[name].bundle.js",
    },

    resolve: {
        modules: [
            path.resolve( "./src" ),
            "node_modules",
        ],
    },

    module: {
        rules: [
            {
                test: /(\.jsx|\.js)$/,
                exclude: /node_modules/,
                use: "babel-loader",
            },
            {
                test: /(\.css|\.scss)$/,
                use: ExtractTextPlugin.extract( {
                    fallback: "style-loader",
                    use: [
                        {
                            loader: "css-loader",
                            options: {
                                minimize: true,
                                modules: false,
                                // importLoaders: 1,
                                // localIdentName: "[name]__[local]___[hash:base64:5]",
                            },
                        },
                        "sass-loader",
                    ],
                } ),
            },
        ],
    },
    plugins
};
