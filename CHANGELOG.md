# nextrj_route changelog

## 0.7.0 2023-09-20

- Refactor ErrorMapper arguments order - error argument first

## 0.6.0 2023-09-20

- Fixed default values of allow cors handler

## 0.5.0 2023-09-19

- Make maxAge argument of file download handler functionalization
- File download handler - 304 should not set headers and body
- Create a file server example

## 0.4.0 2023-09-15

- Refactor Route to support Context and Filter
  > Handler API change to `(request: Request,  context?: Context) => Promise<Response> | Response`

## 0.3.0 2023-09-14

- Rename downloadFileHandler to fileDownloadHandler

## 0.2.0 2023-09-14

- Separate Handler to AsyncHandler and SyncHandler
- Add allow cors handler
- Add file download handler

## 0.1.0 2023-09-13

- Initial a base web Route for `Deno.serve`.
