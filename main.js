'use strict'

const http = require('http');
const fs = require('fs');
const url = require('url');
const qs = require('querystring');
const path = require('path'); // used for the security purpose (input)
const sanitizeHtml = require('sanitize-html') // used for the security purpose (output)

function templateHTML(title, list, body, control) {
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
}
function templateList(filesList) {
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

const app = http.createServer((request, response) => {
    let _url = request.url;
    console.log('request.url: ' + _url); // /?id=HTML

    const baseURL = 'http://' + request.headers.host + '/';
    const myURL = new URL(request.url, baseURL);
    console.log('myURL: ' + myURL);

    const pathName = myURL.pathname;
    // URL로 부터 pathname을 얻는다, 예, /
    console.log('myURL.pathname: ' + pathName);
    // URL로 부터 Query String을 얻는다, 예, ?id=HTML
    console.log('myURL.search: ' + myURL.search);
    // URL로 부터 Query String 중 id 키에 대한 값을 얻는다, 예, HTML
    let title = myURL.searchParams.get('id');
    console.log("myURL.searchParams.get('id'): " + title);

    let isHome = false;
    if (pathName === '/') {
        if (title === null) {
            title = 'Welcome';
            isHome = true;
        }
        console.log('title: ' + title);

        // ./data 폴더에 있는 파일들의 목록을 불러와서 리스트를 만든다.
        fs.readdir('./data', (err, filesList) => {
            if (err) throw err;

            /*
             * Scurity 보완 :
             * 외부로 부터 입력된 데이터로 부터, 부모 폴더에 있는 JS 파일과 같은 파일을 찾지 못하게 한다.
             */
            const filteredId = path.parse(title).base; 

            const list = templateList(filesList);
            fs.readFile(`data/${filteredId}`, 'utf8', (err, description) => {
                if (err) throw err;
        
                console.log(description);
        
                /*
                 * Scurity 보완 :
                 * 출력되는 데이터로 부터, 악성 해킹 코드를 제거한다.
                 */
                const sanitizedTitle = sanitizeHtml(title);
                const sanitizedDescription = sanitizeHtml(description);
                // Query String에서 id 값에 따라서 내용을 다르게 HTML 구문으로 만들자.
                // 예, localhost:8080?id=HTML
                const template = templateHTML(sanitizedTitle, list, 
                    `<h2>${sanitizedTitle}</h2>${sanitizedDescription}`,
                    isHome ? 
                        `<a href="/create">CREATE</a>` : 
                        `
                            <a href="/create">CREATE</a> 
                            <a href="/update?id=${sanitizedTitle}">UPDATE</a>
                            <form action="/delete_process" method="post">
                                <input type="hidden" name="id" value="${sanitizedTitle}">
                                <input type="submit" value="DELETE">
                            </form>
                         `); // DELETE는 다른 페이지로 가지 말고, 바로 동작해야 함.
        
                response.writeHead(200);
                response.end(template);
            });
        });
    }
    else if (pathName === '/create') { // '/create' 는 templateHTML() 함수 내부에 기인함.
        title = 'WEB - Create';
        fs.readdir('./data', (err, filesList) => {
            if (err) throw err;

            const list = templateList(filesList);
            const template = templateHTML(title, list, 
                `
                <form action="/create_process" method="post">
                    <p><input type="text" name="title" placeholder="title"></p>
                    <p>
                        <textarea name="description" placeholder="description"></textarea>
                    </p>
                    <p>
                        <input type="submit">
                    </p>
                </form>
                `,
                '');

            response.writeHead(200);
            response.end(template);
        });
    }
    else if (pathName === '/create_process') { // 바로 위 templateHTML 참조
        let body = '';
        request.on('data', (data) => { // data 이벤트
            body = body + data;
            // 들어온 데이터가 너무크면 종료시킨다.
            if (body.length > 1e6) {
                request.socket.destroy();
            }
        });
        request.on('end', () => { // end 이벤트
            const post = qs.parse(body);

            const title = post.title;
            const description = post.description;

            const filteredId = path.parse(title).base; 
            // 내용을 파일에 저장한다.
            fs.writeFile(`./data/${filteredId}`, description, 'utf8', (err) => {
                if (err) throw err;

                // 내용을 페이지에 보여주기위해 Redirection 시킴.
                response.writeHead(302, {Location: `./?id=${title}`});
                response.end();
            });
        });
    }
    else if (pathName === '/update') {
        // ./data 폴더에 있는 파일들의 목록을 불러와서 리스트를 만든다.
        fs.readdir('./data', (err, filesList) => {
            if (err) throw err;

            const filteredId = path.parse(title).base; 

            const list = templateList(filesList);
            fs.readFile(`data/${filteredId}`, 'utf8', (err, description) => {
                if (err) throw err;
        
                // 읽어온 내용을 Form 에 표시한다. 제목은 수정되지 않아야 하므로.. id를 hidden으로 해서 사용한다.
                const template = templateHTML(title, list, 
                    `
                    <form action="/update_process" method="post">
                    <input type="hidden" name="id" value=${title}>
                        <p><input type="text" name="title" placeholder="title" value=${title}></p>
                        <p>
                            <textarea name="description" placeholder="description">${description}</textarea>
                        </p>
                        <p>
                            <input type="submit">
                        </p>
                    </form>
                    `,
                    isHome ? 
                        `<a href="/create">CREATE</a>` : 
                        `<a href="/create">CREATE</a> <a href="/update?id=${title}">UPDATE</a>`);
        
                response.writeHead(200);
                response.end(template);
            });
        });
    }
    else if (pathName === '/update_process') { // 바로 위 templateHTML 참조
        let body = '';
        request.on('data', (data) => { // data 이벤트
            body = body + data;
            // 들어온 데이터가 너무크면 종료시킨다.
            if (body.length > 1e6) {
                request.socket.destroy();
            }
        });
        request.on('end', () => { // end 이벤트
            const post = qs.parse(body);

            const id = post.id;
            const title = post.title;
            const description = post.description;

            const filteredId = path.parse(title).base; 
            /*
             * 만약 title 이름이 변경되었으면 파일 이름도 변경해야 한다.
             */
            fs.rename(`./data/${id}`, `./data/${filteredId}`, (err) => {
                if (err) throw err;
                // 업데이트된 내용을 파일에 저장한다.
                fs.writeFile(`./data/${filteredId}`, description, 'utf8', (err) => {
                    if (err) throw err;
    
                    // 업데이트된 내용을 페이지에 보여주기 위해 Redirection 시킴.
                    response.writeHead(302, {Location: `./?id=${title}`});
                    response.end();
                });
            });
        });
    }
    else if (pathName === '/delete_process') { // '/' 부분 참조
        let body = '';
        request.on('data', (data) => { // data 이벤트
            body = body + data;
            // 들어온 데이터가 너무 크면 종료시킨다.
            if (body.length > 1e6) {
                request.socket.destroy();
            }
        });
        request.on('end', () => { // end 이벤트
            const post = qs.parse(body);

            const id = post.id;

            const filteredId = path.parse(id).base; 
            /*
             * 파일을 삭제한다.
             */
            fs.unlink(`./data/${filteredId}`, (err) => {
                if (err) throw err;

                // 삭제 완료했으므로, 홈으로 간다.
                response.writeHead(302, {Location: './'});
                response.end();
            });
        });
    }
    else {
        console.log('pathname: ' + pathName);

        response.writeHead(404);
        response.end('Not Found');
    }
});
app.listen(8080);