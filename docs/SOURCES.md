# Township and facility sources

The catalog in `data/catalog.json` separates real place information from fictional application records. All activities, identities, registrations, schedules, funding decisions, attendance and points are demonstration data. An activity at a listed place does not reserve it or confer access.

## Verification performed

On **22 October 2026**, each source below returned HTTPS **200** with TLS verification enabled. Relevant page text was inspected for the facility names and amenities listed in the catalog. `verified_at` records this source-content check. It does **not** mean a site visit, current opening confirmation, an accessibility audit, a public-access guarantee or booking authority.

The first attempt was blocked by the environment's egress proxy. The official hostname was then added to the environment draft; subsequent requests succeeded. No TLS checks were disabled and no proxy credentials were extracted.

| Township / facility | Official source | Content confirmed |
| --- | --- | --- |
| Ara Damansara | [Township page](https://www.simedarbyproperty.com/ara-damansara) | Township identity and Cantara development context. |
| Cantara Residences | [Development page](https://www.simedarbyproperty.com/ara-damansara/cantara-residences) | Half basketball court, yoga deck, jogging track, swimming pool and multipurpose/banquet hall. Residential setting; not advertised as a public booking venue. |
| City of Elmina — Radiance parks | [The Eighth, Elmina Green](https://www.simedarbyproperty.com/city-of-elmina/the-eighth-elmina-green/) | Northern Radiance Park: fitness station, bicycle lane and walkway, playground, plaza/shelter, lawn and multipurpose court. Central Radiance Park additionally lists a 100m sprint track and futsal court. Southern Radiance Park lists fitness, BBQ/picnic, walking/cycling and playground amenities. |
| Elmina Central Park | [Official press release](https://www.simedarbyproperty.com/press-releases/sime-darby-property-fuses-art-nature-and-sustainability) | Elmina Central Park and linked thematic park spaces. |
| Putra Heights | [Township page](https://www.simedarbyproperty.com/putra-heights/index.html) | Putra Heights Community Park is listed as a township amenity. |
| Putra Heights Community Park | [Official biodiversity press release](https://www.simedarbyproperty.com/press-releases/sime-darby-property-delivers-its-commitment-urban-biodiversity-putra-heights) | 7.6-acre park; wheelchair-friendly pedestrian pathways; family recreation; solar LED garden lights. This is a published description, not a current-condition assessment. |
| Bandar Bukit Raja — Lyra communal park | [Lyra development page](https://www.simedarbyproperty.com/bandar-bukit-raja/lyra/) | Communal park described for residents; badminton court, basketball court, reflexology path, exercise/stretch stations, integrated playground and swings. The sales gallery's address and hours are **not** assigned to the park. |
| Serenia City — Dynamic Park | [Serenia Aiora development page](https://www.simedarbyproperty.com/serenia-city/serenia-aiora/index.php) | Dynamic Park for youths, with multipurpose court and outdoor fitness. The same source names Euphoria, Recreation and Lawn parks; they are not separately populated in this initial catalog. |
| SJCC — PARC | [Official PARC page](https://www.simedarbyproperty.com/esg/parc/) | Sustainability-driven community hub; gatherings, learning/crafts, events, calisthenic circuit and playground. Published address: Taman Subang Ria, 47500 Subang Jaya, Selangor, MY. |

## Conservative catalog rules

- `verification_status: "Officially documented"` means the source contains the listed identity/amenities. All current opening statuses remain unverified.
- Cantara and Lyra are marked **Residents only**. Other access types remain **Access unverified**; a public-facing marketing page is not evidence of unrestricted access.
- No real venue prices, opening hours, live availability, operator identity or booking rights were established. `pricing_status` is **Pricing not published**, `operator` is `null`, and booking permission is external.
- No coordinates were independently verified. Latitude and longitude remain `null`.
- Only PARC has an address populated, because its venue address was explicitly published. A development sales-office address is not a facility address.
- Activity types are prototype suggestions based on listed amenities. They do not establish that a venue permits an event or that the resident is eligible to use it.
- Catalog images are not taken from these pages. Any decorative illustration elsewhere in the interface must be labelled illustrative and must not be represented as a verified photograph of a venue.
- No official partnership, sponsorship, financial commitment, approval or integration is implied.

## Refreshing the data

1. Open the linked official source with normal HTTPS certificate validation.
2. Confirm the actual facility name and each retained amenity in the content. A successful status code alone is insufficient.
3. Update `verified_at` only after checking the relevant facts. If a source is unavailable or no longer supports a field, mark it for recheck and remove unsupported detail.
4. Verify current opening, eligibility, booking permission and accessibility directly with the venue before representing those facts as current. A historical press release or marketing plan is insufficient.
5. Keep illustrative event costs, simulated slots and sample activity records separate from facility facts.

Source pages can change. The links and this check date are provenance for the prototype, not a guarantee of present conditions.
