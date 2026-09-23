declare module "*?worker&inline" {
  const worker: new (options?: WorkerOptions) => Worker;
  export default worker;
}
declare module "*.woff?inline" {
  const data: string;
  export default data;
}
declare module "mammoth/mammoth.browser" {
  import * as mammoth from "mammoth";
  export default mammoth;
}