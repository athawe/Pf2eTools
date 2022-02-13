"use strict";

class PageFilterFeats extends PageFilter {
	constructor (opts) {
		super(opts);
		opts = opts || {};
		this._levelFilter = new RangeFilter({
			header: "Level",
			min: 1,
			max: 20,
			isLabelled: true,
		});
		this._typeFilter = new Filter({header: "Type", selFn: opts.typeDeselFn});
		this._ancestryFilter = new Filter({header: "Ancestries"});
		this._archetypeFilter = new Filter({header: "Archetypes", items: ["Archetype"]});
		this._classFilter = new Filter({header: "Classes"});
		this._skillFilter = new Filter({header: "Skills"});
		this._timeFilter = new Filter({
			header: "Activity",
			itemSortFn: SortUtil.sortActivities,
		});
		this._traitsFilter = new TraitsFilter({
			header: "Traits",
			discardCategories: {
				Class: true,
				"Ancestry & Heritage": true,
				"Archetype": true,
				Creature: true,
				"Creature Type": true,
			},
		});
		this._miscFilter = new Filter({
			header: "Miscellaneous",
			items: ["Has Trigger", "Has Frequency", "Has Prerequisites", "Has Requirements", "Has Cost", "Has Special", "Leads to...", "Variant"],
			deselFn: (it) => it === "Variant",
		});
	}

	mutateForFilters (feat) {
		if (feat.featType == null) feat.featType = {};
		feat._fSources = SourceFilter.getCompleteFilterSources(feat);
		feat._slPrereq = Renderer.stripTags(feat.prerequisites || `\u2014`).uppercaseFirst();
		feat._fTraits = feat.traits.map(t => Parser.getTraitName(t));
		if (!feat._fTraits.map(t => Renderer.trait.isTraitInCategory(t, "Rarity")).some(Boolean)) feat._fTraits.push("Common");

		feat._fType = [];
		if (Renderer.trait.filterTraitsByCats(feat._fTraits, ["Ancestry & Heritage"]).length) feat._fType.push("Ancestry");
		if (feat._fTraits.includes("Archetype")) feat._fType.push("Archetype");
		if (Renderer.trait.filterTraitsByCats(feat._fTraits, ["Class"]).length) feat._fType.push("Class");
		if (feat._fTraits.includes("General")) feat._fType.push("General");
		if (feat._fTraits.includes("Skill")) feat._fType.push("Skill");
		const slTypeArr = feat._fType.includes("Skill") ? feat._fType.filter(t => t !== "General") : feat._fType;
		feat._slType = slTypeArr.sort(SortUtil.ascSort).join(", ");

		feat._fTime = Parser.timeToActivityType(feat.activity);
		feat._fMisc = [];
		if (feat.prerequisites != null) feat._fMisc.push("Has Prerequisites");
		if (feat.trigger != null) feat._fMisc.push("Has Trigger");
		if (feat.frequency != null) feat._fMisc.push("Has Frequency");
		if (feat.requirements != null) feat._fMisc.push("Has Requirements");
		if (feat.cost != null) feat._fMisc.push("Has Cost");
		if (feat.special != null) feat._fMisc.push("Has Special");
		if (feat.leadsTo && feat.leadsTo.length) feat._fMisc.push("Leads to...");
		if (feat.featType.variant === true) feat._fMisc.push("Variant");
		// FIXME: Temporary workaround until prerequisites data changes
		if (feat.prerequisites) {
			const regExpSkills = /{@skill (.*?)[}|]/g;
			feat.featType.skill = feat.featType.skill || [];
			feat.featType.skill.push(...[...feat.prerequisites.matchAll(regExpSkills)].map(m => m[1]));
		}
	}

	addToFilters (feat, isExcluded) {
		if (isExcluded) return;

		this._typeFilter.addItem(feat._fType);
		this._traitsFilter.addItem(feat._fTraits);
		if (typeof (feat.featType.archetype) !== "boolean") this._archetypeFilter.addItem(feat.featType.archetype);
		if (typeof (feat.featType.skill) !== "boolean") this._skillFilter.addItem(feat.featType.skill);

		this._ancestryFilter.addItem(Renderer.trait.filterTraitsByCats(feat._fTraits, ["Ancestry & Heritage"]));
		this._classFilter.addItem(Renderer.trait.filterTraitsByCats(feat._fTraits, ["Class"]));

		if (feat._fTime != null) this._timeFilter.addItem(feat._fTime);
		this._sourceFilter.addItem(feat._fSources);
	}

	async _pPopulateBoxOptions (opts) {
		opts.filters = [
			this._sourceFilter,
			this._typeFilter,
			this._levelFilter,
			this._ancestryFilter,
			this._archetypeFilter,
			this._classFilter,
			this._skillFilter,
			this._timeFilter,
			this._traitsFilter,
			this._miscFilter,
		];
	}

	toDisplay (values, ft) {
		return this._filterBox.toDisplay(
			values,
			ft._fSources,
			ft._fType,
			ft.level,
			ft._fTraits, // Ancestry should be in the traits
			ft.featType.archetype,
			ft._fTraits, // Class as well
			ft.featType.skill,
			ft._fTime,
			ft._fTraits,
			ft._fMisc,
		);
	}
}
