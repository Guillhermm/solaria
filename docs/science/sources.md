# Science sources check (2026-11-17)

Statuses: verified (read at the primary source), supported (consistent, not checked end to end), contradicted, no source found. Quotes are from the pages as read; where only a paraphrase was available, it is marked.

## 1. Provenance of public/tiles/hubble-mosaic and hubble-mosaic-high

Claim: both tile sets come from the NASA/ESA/STScI Hubble M31 PHAT+PHAST panorama released 16 January 2025 (ESA heic2501a, NASA asset STScI-01JGY8ZEDHYMGM99RF1RQ45YWY). Status: verified by dimensions, not by pixel comparison.

Evidence from the repo (computed from tile files at level 6, where scale = 1 in scripts/generate-tiles.ts, tile size 256):
- hubble-mosaic-high: 165 columns, last column 224 px; 39 rows, last row 142 px. Width = 164*256+224 = 42208, height = 38*256+142 = 9870. Result 42208 x 9870.
- hubble-mosaic: 42 columns, last 56 px; 10 rows, last 164 px. Width = 41*256+56 = 10552, height = 9*256+164 = 2468. Result 10552 x 2468 (= 42208/4 and 9870/4 rounded up).
- The repo holds no record of the source: scripts/generate-tiles.ts takes the input path as an argument, git history has no source file and no mention of PHAT, heic or hubblesite. Tiles were committed in 25d5f4b (2025-10-05). The only clue in the repo is docs/backend-requirements.md "Andromeda 2.5 gigapixel (Hubble)".

Evidence at the source:
- NASA asset page https://science.nasa.gov/asset/hubble/hubble-m31-phatphast-mosaic/ (Release Date January 16, 2025) lists "Quarter Res (For Print) 42208 x 9870 tif 992.82 MB" and "Reduced Res 2 10552 x 2468 png 43.45 MB". Both pixel sizes equal our two tile sets exactly.
- ESA page https://esahubble.org/images/heic2501a/ : "Image size: 42208 x 9870 px", Fullsize Original (TIFF) 992.8 MB.
- The 2015 PHAT mosaic is a different file: https://science.nasa.gov/asset/hubble/hubble-m31-phat-mosaic/ , 17384 x 5558, aspect 3.13 vs 4.28 for our tiles. Not the source.

Errors found in the repo:
- src/app/api/images/route.ts says hubble-mosaic-high is 96000 x 20000 with maxLevel 7, and hubble-mosaic is 20000 x 12000 with maxLevel 8. Status: contradicted. Tiles are 42208 x 9870 (levels 0 to 6) and 10552 x 2468 (levels 0 to 6). The 96000 x 20000 figure in product-vision.md section 1 is the same error.
- route.ts timestamp "2015-10-02" is wrong for these tiles. The release date is 2025-01-16 (the 2015 release is 2015-01-05, not 10-02). Status: contradicted.
- The "2.5 gigapixel" in the repo docs: ESA says "The mosaic image is made up of at least 2.5 billion pixels" (https://esahubble.org/news/heic2501). The file we tiled is 42208 x 9870 = 417 Mpx, a quarter-resolution rendition. NASA also lists a half-res 84416 x 19739 PNG (965.84 MB). The app must not say the viewer shows 2.5 gigapixels.
- The viewer is a quarter-resolution rendition, so "full resolution" cannot be claimed. Half-res (84416 x 19739) is public if more depth is wanted.

Not checked: pixel-by-pixel match between our tiles and the file (not done yet). The dimensions match to the pixel on two independent renditions, which makes a different source very unlikely. Which of the PNG or TIF was used is unknown.

Credit lines (two versions, both published):
- NASA: "NASA, ESA, Benjamin Williams (UWashington), Zhuo Chen (UWashington), L. Clifton Johnson (Northwestern);" "Image Processing: Joseph DePasquale (STScI)". Status: verified (NASA asset page).
- ESA: "NASA, ESA, B. Williams (University of Washington)" (https://esahubble.org/images/heic2501a/). Status: verified.
- Recommended for the app: use the NASA long form, since it names the image processor.

Terms: ESA/Hubble is CC BY 4.0 (below). The NASA asset page itself states no terms; NASA media guidelines apply (below).

## 2. Per candidate

### Hubble PHAT+PHAST M31 (MVP)
- Full-resolution file: https://assets.science.nasa.gov/content/dam/science/missions/hubble/releases/2025/01/STScI-01JGY8ZEDHYMGM99RF1RQ45YWY.tif (42208 x 9870, TIF 992.82 MB); half res PNG 84416 x 19739, 965.84 MB (rendition URL "Half Res (For Display).png" on the same path). Also ESA: https://esahubble.org/media/archives/images/original/heic2501a.tif and https://cdn.esahubble.org/archives/images/large/heic2501a.jpg (330.0 MB). Status: verified.
- Terms: ESA/Hubble "released under the Creative Commons Attribution 4.0 International license" (https://esahubble.org/copyright/). Redistribution and modification allowed with credit; may not "state or imply endorsement". Status: verified for the ESA copy. The NASA copy: see NASA rule below.
- Trap: none for redistribution. The ESA site says text, music, papers and code are excluded and logos need written consent.

### NASA general media rule (applies to NASA-hosted files and PIA images)
- Source: https://www.nasa.gov/nasa-brand-center/images-and-media/ . "generally are not subject to copyright in the United States"; "NASA should be acknowledged as the source of the material"; "it must not explicitly or implicitly convey NASA's endorsement of commercial goods or services"; third-party material: "Those wishing to use copyright protected material of third parties must contact the copyright holder directly." Status: verified (partly paraphrased).
- Practical note: the product-vision statement "permissive for non-commercial use" is not what NASA says. NASA says generally not copyrighted and not to imply endorsement, with no non-commercial limit. Status: contradicted in wording.
- Hosting on our R2 bucket: allowed by these terms for NASA-authored images.

### STScI terms
- https://www.stsci.edu/copyright : "it is requested that in any subsequent use of this work, NASA and STScI be given appropriate acknowledgement." Third-party material on the site "may claim copyright"; contributors can restrict redistribution. Status: verified (second part paraphrased). Check each image for a third-party credit (see 2015 PHAT credit with "R. Gendler" below).

### Webb: Pillars of Creation (NIRCam, 2022)
- Full file: https://assets.science.nasa.gov/content/dam/science/missions/webb/science/2022/10/STScI-01GGF8H15VZ09MET9HFBRQX4S3.png , 8423 x 14589 (PNG 152.33 MB; TIF 163.43 MB). ESA: https://esawebb.org/images/weic2216b/ , 8423 x 14589 px, same size. Status: verified.
- Credit (NASA): "NASA, ESA, CSA, STScI; Image Processing: Joseph DePasquale (STScI), Anton Koekemoer (STScI), Alyssa Pagan (STScI)". Credit (ESA): "NASA, ESA, CSA, STScI; J. DePasquale, A. Koekemoer, A. Pagan (STScI)." Status: verified.
- Terms: ESA/Webb CC BY 4.0 (https://esawebb.org/copyright/): "available for use without prior permission and without charge"; credit "must be presented in a clear and readable manner to all users, with the wording unaltered." Status: verified.
- Hubble vs Webb side by side exists as weic2216d, 13560 x 6551 px (from search result, not opened). Status: supported.
- Southern Ring Nebula: not checked.

### Webb pair now in the app (unlabeled "Before"/"After")
- Files: STScI-01K0W69T4CK5TD4EZF8RCRRJ2Z.png is 4320 x 4602; STScI-01K0W7HK9320DCD8PTZQ55FKWV.png is 1295 x 1097 (read from the PNG headers). Both are served by assets.science.nasa.gov and return HTTP 200.
- Identity: no page found by ID. Folder 2025/07 and the page subtitle "Nebula Giant Cloud" fit the Cat's Paw Nebula release of 10 July 2025 (ESA weic2513: https://esawebb.org/images/weic2513a/ NIRCam 11055 x 12138, credit "NASA, ESA, CSA, STScI"). Status: unverified. The different sizes and aspect ratios (0.939 and 1.18) show the two are not one registered pair, so a slider "same place" claim is unsafe. Identify the NASA asset before any use.

### Hubble 2015 PHAT (alternative, not recommended)
- https://science.nasa.gov/asset/hubble/hubble-m31-phat-mosaic/ , 17384 x 5558 TIF 348.58 MB, release 2015-01-05. Credit: "NASA, ESA, J. Dalcanton, B.F. Williams, and L.C. Johnson (University of Washington), the PHAT team, and R. Gendler". Status: verified. R. Gendler is an outside image processor; check his terms before redistributing. Superseded by the 2025 file.

### HiRISE (MRO)
- Terms: https://uahirise.org/media/usage.php : images are in the public domain, "there is no copyright restriction" (paraphrased; full text not quoted). Credit requested: "Image: NASA/JPL/University of Arizona". Status: verified.
- Credit conflict: the product page https://www.uahirise.org/ESP_016962_2555 uses "NASA/JPL-Caltech/UArizona". Use the credit printed on each product page. Status: verified discrepancy.
- Files: JP2 on that product: 1418 MB map-projected B&W full product; scale 25 cm/pixel map-projected, 32.2 cm/pixel original. Pixel dimensions are not printed on the page. Status: no pixel size found; compute from the JP2 or the PDS label for the chosen product.
- Trap: none for terms. Files of 0.3 to 1.4 GB per product, JP2 needs conversion.

### LROC (LRO)
- Trap, partly. https://lroc.im-ldi.com/about/terms : "Data products available through the LROC Data Node of the PDS or through NASA PDS interfaces are in the public domain." "Images available on the LROC website... are copyrighted." Educational use "encouraged and permitted without prior permission" if properly cited; "Commercial use of images not downloaded from the LROC PDS archive: require prior permission" (the second is paraphrased). The site footer reads "All rights reserved." Status: verified.
- Rule for Solaria: take only files from the PDS archive, never web-site JPEGs, for a public site on our own bucket. A public website with R2 hosting is arguably more than "educational", so the website copies are unsafe.
- Credit: "NASA/GSFC/Arizona State University", short form "NASA/GSFC/ASU". Status: verified.
- Full-resolution mosaic and pixel size: no source found. The LROC about page gives scale only (WAC 100 m/pixel, NAC 0.5 m/pixel). Not checked: PDS RDR mosaic labels, Solar System Treks.

### SDO
- Terms: https://sdo.gsfc.nasa.gov/data/rules.php : "SDO images and movies are not copyrighted unless explicitly noted." Required acknowledgement: "Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams." "Browse products are not intended for science analysis or publication" without the PI's consent. Status: verified.
- Full disk: https://sdo.gsfc.nasa.gov/data/ lists sizes 4096, 2048, 1024, 512. The page does not give pixel dimensions; 4096 is the largest listed. File URL pattern not checked. Status: supported.
- Watch: the browse-product rule limits "science" claims. A journey that states solar measurements needs the calibrated data or the caveat.

### GIBS and Worldview
- Terms: Earthdata data use page (https://www.earthdata.nasa.gov/engage/open-data-services-software-policies/data-use-guidance): NASA-led mission data are "licensed as Creative Commons Zero (CC0)"; non-NASA data distributed through ESDIS are "subject to the license arrangements of the sponsoring organization". "NASA should be acknowledged as the source". Status: verified.
- Acknowledgement text from https://nasa-gibs.github.io/gibs-api-docs/ : "We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)." Status: verified.
- Trap: GIBS serves tiles through a service. Rehosting tiles in R2 means a static snapshot of one date and layer; that is allowed for CC0 layers but each layer's source (some non-NASA products) must be checked. No single full-resolution file exists, so "full-resolution file and pixel size" has no answer: no source found. Not checked: the layer's maximum zoom and tile matrix.

### ESA/Webb credit rule difference
- ESA publishes CC BY 4.0; STScI/NASA publishes with "requested" acknowledgement. Both are fine for R2. The credit text differs slightly between NASA and ESA pages; store the credit line from the page you took the file from.

## 3. Traps (summary)
1. LROC website images are copyrighted ("All rights reserved"); only the PDS archive is public domain. Use PDS products only.
2. The existing Webb pair is unidentified and has two different frames, so it can't support a "same place" comparison.
3. 2015 PHAT mosaic carries an outside processor in the credit (R. Gendler); use the 2025 file.
4. HiRISE credit differs between the policy page and product pages; SDO browse products are not for science claims; ESA/NASA credits differ for the same image.
5. Counts: route.ts and product-vision.md carry wrong sizes and date for the tiles (96000 x 20000, 2015-10-02).
No candidate has a non-commercial licence or blocks redistribution; the only conditional one is LROC website content.

## Unchecked
Southern Ring Nebula, MRO CTX/MOLA global mosaics, Solar System Treks terms, GIBS layer zoom limits, SDO file URLs and pixel dimensions, LROC PDS mosaic sizes, the NASA PIA pages for Jupiter and Neptune, INPE catalog, exact tile-to-file pixel comparison, ESA/Webb weic2216d page.
