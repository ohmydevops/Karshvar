# Karshvar hominin catalog

`public/data/hominin-catalog.json` is the editable catalog. Schema version 1 links four tables by stable IDs.

| Table | Meaning | Fields |
| --- | --- | --- |
| sites | A source-identified locality or collection location | Name, country, coordinates, precision, coordinate source, uncertainty in metres |
| findings | A taxon occurrence, source report or identified specimen | Site ID, specimen ID, skeletal element, evidence type, preferred report, superseding finding |
| sources | Bibliographic source | Citation, URL, source type, reuse license |
| reports | An assertion about a finding | Taxonomic identification, age, review and provenance |

Ages are stored in years before present. `age.target` is `specimen`, `layer`, `occupation`, `collection`, or `unspecified`. `younger` and `older` are independent nullable bounds. A missing bound is not zero. `method`, `uncertainty`, and taxonomy `confidence` preserve reported information, and remain null when unreported. Preserve the source's dating convention and uncertainty in `age.label` when available. A point estimate may have equal bounds and must retain its approximate wording.

Every report retains the input file, original record ID, source date, import date and unmodified original record. Imported reports have `review.status = imported`; their legacy review date does not certify a new scientific review. Curated reports can record `reviewedAt`, reviewer and review notes. Do not derive numerical confidence from source reputation.

The initial import retains 423 hominin records, including 11 explicitly superseded occurrences. The map exports 412 active records. PBDB occurrence identifiers are not specimen numbers. Initial site merging uses explicit collection identity only. Different reports at nearby coordinates require a documented identity review before sharing a site or finding. Record multiple scientific reports for one finding and select its preferred report explicitly. Preserve disagreements in the other reports.

## Adding or correcting data

1. Check the original publication or collection record and reuse terms.
2. Match the site and specimen using explicit identifiers and cited evidence.
3. Create or reuse a source and site. Add a finding only for a new identity.
4. Add a report with its age target, bounds, source and review status. Unknown fields stay null.
5. Select the preferred report. Link an explicit duplicate through `supersededBy`; retain its provenance.
6. Update the catalog's `updated` date and run `npm run build:offline` and `npm test`.

`build-hominin-catalog.mjs` validates and generates `hominin-map.json` during offline generation, tests and production builds. The map worker reads that compact export. Catalog edits therefore survive builds. `import-hominin-catalog.mjs` is the one-time migration tool and refuses to overwrite an existing catalog. The original three input datasets remain migration evidence. `legacyDisplay` contains compatibility presentation metadata, while taxonomy, ages, locations and citations come from the linked tables.

Licensing on imported PBDB records describes the database metadata. Image and article reuse rights require their own source information. Museum metadata currently has no asserted reuse license.
