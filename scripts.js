const updateValue = (qry, type, value) => {
    const el = document.querySelector(qry)
    const currentValue = parseInt(el.value, 10)
    let maxValue = null
    let minValue = null
    if (el.getAttribute("max")) {
        maxValue = parseInt(el.getAttribute("max"), 10)
    }

    if (el.getAttribute("min")) {
        minValue = parseInt(el.getAttribute("min"), 10)
    }

    if (type == "add") {
        if (typeof maxValue == 'number' && currentValue + value > maxValue) {
            el.value = maxValue
        } else {
            el.value = currentValue + value
        }
    } else if (type == "subtract") {
        if (typeof minValue == 'number' && currentValue - value < minValue) {
            el.value = minValue
        } else {
            el.value = currentValue - value
        }
    }
}
document.getElementById('input-file')
    .addEventListener('change', showrows);
document.getElementById('encoding')
    .addEventListener('change', showrows);

document.getElementById('submit').onclick = function () {
    const input = document.getElementById('input-file');
    if ('files' in input && input.files.length > 0) {
        placeFileContent(
            document.getElementById('content-target'),
            input.files[0])
    }
}
function showrows(event) {
    const ele_file =  document.getElementById('input-file');
    if ('files' in ele_file && ele_file.files.length > 0) {
        readRows(
            document.getElementById('file-rows'),
            ele_file.files[0])
    }
}
async function readRows(target, file) {
    const encoding = document.getElementById('encoding').value;
    await readFileContent(file, encoding).then(content => {
        let texts = content.split(/\r?\n/);
        texts = texts.slice(0, 10);
        let h = "";
        for (let i = 0; i < texts.length; i++) {
            h += "<p>" + texts[i] + "</p>";
        }
        target.innerHTML = h;
    }).catch(error => console.log(error))
}


async function placeFileContent(target, file) {
    const encoding = document.getElementById('encoding').value;
    await readFileContent(file, encoding).then(content => {
        let chapters = load_fulltext(content);
        filename = file.name.replace("\.txt", "");

        create_epubs(chapters, filename, encoding);


        //create_epub(chapters, filename);
    }).catch(error => console.log(error))
}
function get_file_number() {
    let file_number = parseInt(document.querySelector("#file-split").value);
    if (file_number === undefined || file_number < 1) {
        file_number = 1;
    }
    return file_number;
}

function update_file_div(files) {
    let ele = document.querySelector("#file-target");
    let content_html = "";
    content_html += "<p>文件数 " + get_file_number() + "</p>";


    content_html += "<table>";
    content_html += "<tr>";
    content_html += "    <th>文件名</th>";
    content_html += "    <th>开始</th>";
    content_html += "    <th>结束</th>";
    content_html += " </tr>";
    for (let i = 0; i < files.length; i++) {
        content_html += "  <tr>";
        content_html += "    <td>" + files[i].filename + "</td>";
        content_html += "    <td>" + (files[i].start + 1) + "</td>";
        content_html += "    <td>" + files[i].end + "</td>";
        content_html += " </tr>";
    }
    content_html += "</table>";

    ele.innerHTML = content_html;
}
// Update information for chapters
function update_chapter_div(chapters) {
    let ele = document.querySelector("#content-target");

    let content_html = "";

    content_html += "<p>章节数 <strong>" + chapters.length + "</strong>";

    content_html += "<ul>";
    for (let i = 0; i < chapters.length; i++) {
        content_html += '<li>' + chapters[i].title + '</li>';
    }
    content_html += "</ul>";
    ele.innerHTML = content_html;
}
function readFileContent(file, encoding = "UTF-8") {
    const reader = new FileReader()
    return new Promise((resolve, reject) => {
        reader.onload = event => resolve(event.target.result)
        reader.onerror = error => reject(error)
        reader.readAsText(file, encoding)
    })
}
function load_fulltext(data) {
    // const response = await fetch(path);
    // if (!response.ok) {
    //     console.log("Fail to get txt");
    //     return;
    // }
    // const data = await response.text();
    // let ele = document.querySelector("#content-target");

    let texts = data.split(/\r?\n/);
    let cap_match = new RegExp("^.*(第.{1,10}(章|节)|楔子|引子)");
    let chapters = [];
    let chapter_title = "";
    let chapter_id = 0;
    let chapter_content_previous = "";
    for (let i = 0; i < texts.length; i++) {
        let text_i = texts[i].trim();
        // if find a new chapter
        if (text_i.match(cap_match)) {
            if (chapter_id > 0) {
                chapters.push({
                    title: chapter_title,
                    content: chapter_content_previous
                })
            }
            chapter_id++;
            chapter_title = text_i;
            chapter_content_previous = "";
        } else {
            chapter_content_previous += "<p>" + text_i + "</p>\n";
        }
    }
    return (chapters);
}
async function create_epubs(chapters, filename, encoding = "UTF-8") {
    let file_number = get_file_number();
    let file_chapter = Math.ceil(chapters.length / file_number);
    let files = [];
    let all_zips = new JSZip();
    for (let i = 0; i < file_number; i++) {

        let idx_start = i * file_chapter;
        let idx_end = Math.min((i + 1) * file_chapter, chapters.length);
        let filename_i = filename + '-' + (i + 1) + '-Ch' + (idx_start + 1) + "-Ch" + idx_end + ".epub";
        let chapters_i = chapters.slice(idx_start, idx_end);
        files.push({
            filename: filename_i,
            start: idx_start,
            end: idx_end
        });
        //console.log(filename_i + " " + idx_start + " " + idx_end);
        let zip_i = create_epub(chapters_i, filename_i);
        let zip_i_c = await zip_i.generateAsync({ type: 'blob' });
        all_zips.file(filename_i, zip_i_c);
    }

    all_filename = filename + ".zip";
    await all_zips.generateAsync({ type: "blob" }).then(function (blob) {
        saveAs(blob, all_filename);
    });
    update_file_div(files);
    update_chapter_div(chapters);
}
function create_epub(chapters, filename) {
    var zip = new JSZip();

    // Set the metadata for the book
    var mimetype = 'application/epub+zip';
    zip.file("mimetype", mimetype);

    var container = '<?xml version="1.0"?>' +
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
        '  <rootfiles>' +
        '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />' +
        '  </rootfiles>' +
        '</container>';
    zip.file("META-INF/container.xml", container);

    var metadata = '<?xml version="1.0"?>' +
        '<package version="3.0" xml:lang="en" xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id">' +
        '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
        '    <dc:identifier id="book-id">urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0</dc:identifier>' +
        '    <meta refines="#book-id" property="identifier-type" scheme="xsd:string">uuid</meta>' +
        '    <meta property="dcterms:modified">2000-03-24T00:00:00Z</meta>' +
        '    <dc:language>en</dc:language>' +
        '    <dc:title>My Book</dc:title>' +
        '    <dc:creator>John Smith</dc:creator>' +
        '  </metadata>' +
        '  <manifest>' +
        '    <item id="text" href="text.xhtml" media-type="application/xhtml+xml"/>' +
        '    <item id="toc" href="../OEBPS/toc.ncx" media-type="application/x-dtbncx+xml"/>' +
        '  </manifest>' +
        '  <spine toc="toc">' +
        '    <itemref idref="text"/>' +
        '  </spine>' +
        '</package>';
    zip.file("OEBPS/content.opf", metadata);

    // Set the table of contents for the book
    var toc = '<?xml version="1.0"?>' +
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">' +
        '  <head>' +
        '    <meta charset="' + encoding + '">' +
        '    <meta name="dtb:uid" content="urn:uuid:B9B412F2-CAAD-4A44-B91F-A375068478A0"/>' +
        '    <meta name="dtb:depth" content="1"/>' +
        '    <meta name="dtb:totalPageCount" content="0"/>' +
        '    <meta name="dtb:maxPageNumber" content="0"/>' +
        '  </head>' +
        '  <docTitle>' +
        '    <text>My Book</text>' +
        '  </docTitle>' +
        '  <navMap>';
    for (let i = 0; i < chapters.length; i++) {
        toc += '    <navPoint id="navpoint-' + i + '" playOrder="' + i + '">' +
            '      <navLabel>' +
            '        <text>' + chapters[i].title + '</text>' +
            '      </navLabel>' +
            '      <content src="text.xhtml#chapter-' + i + '"/>' +
            '    </navPoint>'
    }
    toc += '  </navMap>' +
        '</ncx>';
    zip.file("OEBPS/toc.ncx", toc);

    // Add the text of the book to the ZIP file
    var full_text = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
        '<!DOCTYPE html>' +
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">' +
        '  <head>' +
        '    <meta charset="' + encoding + '">' +
        '    <title>My Book</title>' +
        '  </head>' +
        '  <body>';
    for (let i = 0; i < chapters.length; i++) {
        full_text += '    <section><h2 id="chapter-' + i + '">' + chapters[i].title + '</h2>' +
            chapters[i].content +
            '<span style="page-break-after: always" />' +
            '    </section>'
    }
    full_text += '</body>' +
        '</html>';

    zip.file("OEBPS/text.xhtml", full_text);
    // Generate a downloadable EPUB file from the ZIP file
    return zip;
}
//load_fulltext("wd.txt");
