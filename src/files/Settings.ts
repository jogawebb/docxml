import * as path from 'https://deno.land/std@0.146.0/path/mod.ts';

import { Archive } from '../classes/Archive.ts';
import { XmlFile } from '../classes/XmlFile.ts';
import { ContentType } from '../enums.ts';
import { create } from '../utilities/dom.ts';
import { ALL_NAMESPACE_DECLARATIONS, QNS } from '../utilities/namespaces.ts';
import { evaluateXPathToMap } from '../utilities/xquery.ts';
import { File, Relationships } from './Relationships.ts';

type SettingsJson = {
	isTrackChangesEnabled: boolean;
};

const DEFAULT_SETTINGS: SettingsJson = {
	isTrackChangesEnabled: false,
};

export class Settings extends XmlFile implements SettingsJson {
	public static contentType = ContentType.settings;

	public readonly relationships: Relationships;

	public isTrackChangesEnabled = false;

	public constructor(
		location: string,
		relationships = new Relationships(
			`${path.dirname(location)}/_rels/${path.basename(location)}.rels`,
		),
		settings: SettingsJson = DEFAULT_SETTINGS,
	) {
		super(location);
		this.relationships = relationships;
		Object.assign(this, settings);
	}

	protected toNode(): Document {
		return create(
			`<w:settings ${ALL_NAMESPACE_DECLARATIONS}>
				{
					if ($isTrackChangesEnabled) then element ${QNS.w}trackRevisions {
						(: attribute ${QNS.w}val { $isTrackChangesEnabled } :)
					} else ()

				}
			</w:settings>`,
			{
				isTrackChangesEnabled: this.isTrackChangesEnabled,
			},
			true,
		);
	}

	public getRelated(): File[] {
		return [this, ...this.relationships.getRelated()];
	}

	/**
	 * Instantiate this class by looking at the DOCX XML for it.
	 */
	public static async fromArchive(archive: Archive, location: string): Promise<Settings> {
		let relationships;

		const relationshipsLocation = `${path.dirname(location)}/_rels/${path.basename(location)}.rels`;
		try {
			relationships = await Relationships.fromArchive(archive, relationshipsLocation);
		} catch (error: unknown) {
			console.error(
				'Warning, relationships could not be resolved\n' +
					((error as Error).stack || (error as Error).message),
			);
		}

		const settings = evaluateXPathToMap(
			`/${QNS.w}settings/map {
				"isTrackChangesEnabled": ooxml:is-on-off-enabled(./${QNS.w}trackChanges/@${QNS.w}val)
			}`,
			await archive.readXml(location),
		) as SettingsJson;
		return new Settings(
			location,
			relationships || new Relationships(relationshipsLocation),
			settings,
		);
	}
}
