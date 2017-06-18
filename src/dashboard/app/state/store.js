import { createStore, applyMiddleware, combineReducers } from "redux";
import apiService from "./apiService";
import thunkMiddleware from "redux-thunk";

const events = ( state = [], action ) => {
    switch ( action.type ) {
        case "FETCH_EVENTS_COMPLETED":
            return action.payload;
        default:
            return state;
    }
};

export default function configureStore( initialState ) {
    const rootReducer = combineReducers( {
        events
    } );

    return createStore(
        rootReducer,
        initialState,
        applyMiddleware(
            apiService,
            thunkMiddleware,
        ),
    );
}
