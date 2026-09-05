import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Daytona } from "@daytona/sdk";
import { DaytonaComputers } from "../src/computers/service.js";
const request = JSON.parse(await readFile("/tmp/orbit-daytona-smoke-request.json", "utf8"));
try {
  const service = new DaytonaComputers(new Daytona(), {workspaceId:"personal",instanceId:(await readFile(".data/instance-id","utf8")).trim(), image:"daytonaio/sandbox:0.6.0",autoStopMinutes:30,vncPort:6080});
  const machine = await service.create({name:"Orbit integration test",os:"ubuntu",cpu:2,ramGb:4,storageGb:20},request.requestId);
  console.log({id:machine.id,status:machine.status});
} catch (e) {
 const error = e as {name?:string;code?:string;message?:string;statusCode?:number};
 let message = error.message || "";
 for (const key of [process.env.DAYTONA_API_KEY,process.env.ORBIT_API_TOKEN]) if(key) message=message.split(key).join("[redacted]");
 console.log({name:error.name,code:error.code,status:error.statusCode,message:message.slice(0,800)});
}
