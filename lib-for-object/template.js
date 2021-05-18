const template = {
    html: function(title, list, body, control) {
        return `
        <!doctype html>
        <html>
        <head>
        <title>WEB2 - ${title}</title>
        <meta charset="utf-8">
        </head>
        <body>
        <h1><a href="/">WEB</a></h1>
        ${list}
        ${control}
        ${body}
        </body>
        </html>
        `;
    },
    list: function(filesList) {
       /* 그 리스트 각각에 대하여 링크가 있는 라인을 만든다.
        *   <ol>
        *       <li><a href="/?id=HTML">HTML</a></li>
        *       <li><a href="/?id=CSS">CSS</a></li>
        *       <li><a href="/?id=JavaScript">JavaScript</a></li>
        *   </ol>
        */
        let list = '<ol>';
        filesList.forEach(file => {
            list = list + `<li><a href="/?id=${file}">${file}</a></li>`;
            console.log(file);
        });
        list = list + '</ol>';
        return list;
    }
}

module.exports = template;