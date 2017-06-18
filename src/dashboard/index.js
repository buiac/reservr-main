import React from "react";
import { render } from "react-dom";

import { Provider as ReduxProvider } from "react-redux";

import App from "./app/views/layouts/app";

import configureStore from "./app/state/store";
const store = configureStore( {} );

const RootHtml = ( ) => (
    <ReduxProvider store={ store }>
        <App />
    </ReduxProvider>
);

render( <RootHtml />, document.getElementById( "react-root" ) );
