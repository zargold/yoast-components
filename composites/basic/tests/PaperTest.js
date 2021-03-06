import React from "react";
import renderer from "react-test-renderer";

import Paper from "../Paper.js";

test( "the Paper without props matches the snapshot", () => {
	const component = renderer.create(
		<Paper />
	);

	let tree = component.toJSON();
	expect( tree ).toMatchSnapshot();
} );

test( "the Paper with props matches the snapshot", () => {
	const component = renderer.create(
		<Paper backgroundColor="#eee" minHeight="10em" />
	);

	let tree = component.toJSON();
	expect( tree ).toMatchSnapshot();
} );
