import React from 'react';

// Test component with poor formatting
const TestComponent=({name,age}:{name:string;age:number})=>{
const greeting=`Hello ${name}, you are ${age} years old`;
return(<div>{greeting}</div>);
};

export default TestComponent;
