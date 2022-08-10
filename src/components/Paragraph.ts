// Import without assignment ensures Deno does not tree-shake this component. To avoid circular
// definitions, components register themselves in a side-effect of their module.
import './Text.ts';
import './TextAddition.ts';
import './TextDeletion.ts';

import type { ComponentAncestor } from '../classes/Component.ts';
import { Component } from '../classes/Component.ts';
import type { ParagraphProperties } from '../properties/paragraph-properties.ts';
import {
	paragraphPropertiesFromNode,
	paragraphPropertiesToNode,
} from '../properties/paragraph-properties.ts';
import type { SectionProperties } from '../properties/section-properties.ts';
import type { TextProperties } from '../properties/text-properties.ts';
import { createChildComponentsFromNodes, registerComponent } from '../utilities/components.ts';
import { create } from '../utilities/dom.ts';
import { QNS } from '../utilities/namespaces.ts';
import { evaluateXPathToMap } from '../utilities/xquery.ts';
import type { Text } from './Text.ts';
import type { TextAddition } from './TextAddition.ts';
import type { TextDeletion } from './TextDeletion.ts';

/**
 * A type describing the components accepted as children of {@link Paragraph}.
 */
export type ParagraphChild = Text | TextAddition | TextDeletion;

/**
 * A type describing the props accepted by {@link Paragraph}.
 */
export type ParagraphProps = ParagraphProperties & TextProperties;

/**
 * A component that represents a paragraph in your DOCX document, which is one of the most
 * widely used components and the most likely to contain a style rule or other.
 */
export class Paragraph extends Component<ParagraphProps, ParagraphChild> {
	public static readonly children: string[] = ['Text', 'TextAddition', 'TextDeletion'];
	public static readonly mixed: boolean = false;
	private sectionProperties: SectionProperties | null = null;

	public setSectionProperties(properties?: SectionProperties | null) {
		this.sectionProperties = properties || null;
	}

	public toNode(ancestry: ComponentAncestor[]): Node {
		return create(
			`
				element ${QNS.w}p {
					$pPr,
					for $child in $children
						return $child
				}
			`,
			{
				pPr: paragraphPropertiesToNode(this.props, this.sectionProperties),
				children: this.childrenToNode(ancestry),
			},
		);
	}

	static matchesNode(node: Node): boolean {
		return node.nodeName === 'w:p';
	}

	static fromNode(node: Node): Paragraph {
		const { children, ppr, ...props } = evaluateXPathToMap(
			`
				map {
					"ppr": ./${QNS.w}pPr,
					"style": ./${QNS.w}pPr/${QNS.w}pStyle/@${QNS.w}val/string(),
					"children": array{ ./(${QNS.w}r | ${QNS.w}del | ${QNS.w}ins) }
				}
			`,
			node,
		) as { ppr: Node; children: Node[]; style?: string };

		return new Paragraph(
			{
				...paragraphPropertiesFromNode(ppr),
				...props,
			},
			...createChildComponentsFromNodes<ParagraphChild>(this.children, children),
		);
	}
}

registerComponent(Paragraph);
