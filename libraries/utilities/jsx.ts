import { AstComponent, AstNode, Style } from '../types.ts';

type JsxPragmaProps = {
	children: AstNode[];
	style?: Style;
	[key: string]: unknown;
};
type JsxPragma = (
	docxAstComponent: AstComponent<AstNode<string, JsxPragmaProps, unknown>>,
	props: JsxPragmaProps,
	...children: JsxPragmaProps['children']
) => AstNode | Promise<AstNode>;

/**
 * This is the JSX pragma used to transform a hierarchy of AstComponents to the AST that is
 * interpreted by the rest of the application. Import it into any file where you would like to
 * use JSX to compose a DOCX document.
 *
 * For example:
 * ```ts
 * /** @jsx Application.JSX * /
 * import Application, { Document, Paragraph, Section, Text } from '../../mod.ts';
 *
 * await Application.writeAstToDocx(
 *     'from-template.docx',
 *     <Document template={template.init()}>
 *         <Section>
 *             <Paragraph>
 *                 <Text>Howdy.</Text>
 *             </Paragraph>
 *         </Section>
 * 	</Document>,
 * );
 * ```
 *
 * This pragma allows you to use single items as a child, arrays, nested arrays, promises of a child
 * or promises of (nested) arrays, etc. Only attributes will be passed on to their component without
 * being awaited.
 */
export const JSX: JsxPragma = async (component, props, ...children) => {
	await component({
		...props,
		children: await ensureFlatResolvedArray(children),
	});

	return {
		component,
		style: props?.style || null,
		props: props || {},
		children: await ensureFlatResolvedArray(children),
	};
};

type MultiDimensionalArray<P> = Array<P | MultiDimensionalArray<P>>;

/**
 * A helper function that ensures that an array-ish (like JSX children, which could be undefined, a single item or an
 * array of items, or a promise thereof, or all of the aforementioned nested in more arrays) is always a single flat array.
 */
export async function ensureFlatResolvedArray<P>(
	children: P | MultiDimensionalArray<P> | undefined,
) {
	const x = await [children]
		.filter((item): item is P | MultiDimensionalArray<P> => item !== undefined && item !== null)
		.reduce<Promise<P[]>>(recursiveFlattenArray, Promise.resolve([]));
	return x;
}

async function recursiveFlattenArray<P>(
	flat: Promise<P[]>,
	item: P | MultiDimensionalArray<P>,
): Promise<P[]> {
	const iitem = await item;
	if (!Array.isArray(iitem)) {
		return [...(await flat), iitem].filter(Boolean);
	}
	return [
		...(await flat),
		...(await iitem.reduce(recursiveFlattenArray, Promise.resolve([] as P[]))),
	];
}

/**
 * @note Modifies by reference!
 * @todo Not modify by reference
 */
export function bumpInvalidChildrenToAncestry<N extends AstNode>(node: N): N {
	const documentElements = [node];
	(function walk(nodes: (string | AstNode)[]) {
		for (let y = 0; y < nodes.length; y++) {
			const node = nodes[y];
			if (typeof node === 'string') {
				// TODO handle mixed content
				continue;
			}
			walk(node.children);
			for (let i = 0; i < node.children.length; i++) {
				const child = node.children[i];
				if (
					(typeof child === 'string' && node.component.mixed) ||
					(typeof child !== 'string' && node.component.children.includes(child.component.type))
				) {
					// the child is valid;
					// continue;
				} else {
					nodes.splice(nodes.indexOf(node) + 1, 0, ...node.children.splice(i, 1), {
						...node,
						children: node.children.splice(i, node.children.length - i),
					});
				}
			}
		}
	})(documentElements);

	if (documentElements.length !== 1) {
		throw new Error('DXE030: Some AST nodes could not be given a valid position.');
	}

	return documentElements[0];
}

export default JSX;
