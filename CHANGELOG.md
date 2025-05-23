# nextrj_route changelog

## 0.13.0 2025-05-21

- Rename customHeaders to customHeadersParser

## 0.12.0 2025-05-21

> Don't use this version

- Add customHeaders for fileDownloadHandler

## 0.11.0 2023-12-19

- Upgrade to `deno.land/std@0.209.0`

## 0.10.1 2023-11-02

- Change `Promise<void> | Promise<Record<string, unknown>>` to `Promise<void | Record<string, unknown>>`

## 0.10.0 2023-11-02

- Support nested route

## 0.9.0 2023-10-18

- Fixed errorMapper not invoke on async handler

## 0.8.0 2023-09-20

- Make ErrorMapper's request argument optional

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
