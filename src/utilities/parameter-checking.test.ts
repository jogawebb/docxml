import { describe, expect, it, run } from 'https://deno.land/x/tincan@1.0.1/mod.ts';

import { checkForForbiddenParameters, isValidNumber } from './parameter-checking.ts';

describe('Checking for bad object parameters', () => {
	type fakeNestedType = {
		first: string,
		second: number,
		third: boolean
	};
	type fakeType = {
		first: number,
		second: number,
		third: fakeNestedType,
		fourth: number
	};

	const passingInnerObject: fakeNestedType = {
		first: 'darkness',
		second: 4,
		third: false,
	};

	const failingInnerObject: fakeNestedType = {
		first: 'darkness',
		second: NaN,
		third: true,
	};

	const passingOuterObject: fakeType = {
		first: 0xA4,
		second: 123,
		third: passingInnerObject,
		fourth: 0b111,
	};

	const failingOuterObject: fakeType = {
		first: 1,
		second: 2,
		third: failingInnerObject,
		fourth: 3
	}

	it('ensure that NaN is caught when used as a parameter of type number', () => {
		const objTest = checkForForbiddenParameters(
			passingOuterObject,
			isValidNumber,
			true,
		);
		expect(objTest).toBe(true);


		expect(
			() => checkForForbiddenParameters(
				failingOuterObject,
				isValidNumber,
				true
			)
		).toThrow()
	});
});

run();
