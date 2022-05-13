import request from "request";
import * as _ from "lodash";
import { Router } from "express";
import config from "../config";
import MarkdownIt from "markdown-it";
import mdCollapsible from "markdown-it-collapsible";
import { AzureTable } from "../storage/azure-storage";
import { Area, areaTags } from "./exp-tags";

const baseUrl =
  "https://domoreexp.visualstudio.com/DefaultCollection/Teamspace/_apis/";

export interface ListFileResponse {
  count: number;
  value: ListFileResponseItem[];
}

export interface ListFileResponseItem {
  objectId: string;
  gitObjectType: string;
  commitId: string;
  path: string;
  isFolder?: boolean;
  url: string;
}

export class GitRepo {
  private readonly path = `git/repositories/${this.repo}`;

  constructor(private repo: string, private PAT: string) {}

  public getCommitSha(commitSha: string) {
    const uri = `${this.path}/stats/branches?baseVersionType=Commit&baseVersion=${commitSha}`;
    return this.invokeApi(uri);
  }

  public listFiles(folder: string) {
    const uri = `${this.path}/items?scopePath=${folder}&recursionLevel=oneLevel`;
    return this.invokeApi<ListFileResponse>(uri);
  }

  public downloadFile(file: string) {
    return new Promise((resolve, reject) =>
      request.get(
        file,
        { auth: { user: "", pass: this.PAT } },
        (err, res, body) => (err ? reject(err) : resolve(body))
      )
    );
  }

  private invokeApi<T = any>(uri: string): Promise<T> {
    return new Promise<T>((resolve, reject) =>
      request.get(
        uri,
        { baseUrl, auth: { user: "", pass: this.PAT }, json: true },
        (err, res, body) => (err ? reject(err) : resolve(body))
      )
    );
  }
}

export type ExpRing =
  | "ring0"
  | "ring0!"
  | "ring0_s"
  | "ring0_s!"
  | "ring1"
  | "ring1!"
  | "ring1_5"
  | "ring1_5!"
  | "ring1_6"
  | "ring1_6!"
  | "ring2"
  | "ring2!"
  | "ring3"
  | "ring3!"
  | "ring3_6"
  | "ring3_6!"
  | "ring3_9"
  | "ring3_9!"
  | "general"
  | "general!";

export type ExpEnv =
  | "ag08"
  | "ag09"
  | "dev"
  | "dod"
  | "gcc"
  | "gcchigh"
  | "life"
  | "prod";

export interface ExpConfig {
  ring: ExpRing[];
  environment: ExpEnv[];
  value: boolean;
}

export type TableRow = {
  area?: Area;
  rings: { [K in ExpRing]?: ExpEnv[] };
};

export type Table = { [expFlag: string]: TableRow };
export type AllFilesResult = { [fname: string]: Table };

const inheritedRings: { [K in ExpRing]?: ExpRing[] } = {
  ring0_s: [],
  ring0: ["ring0_s"],
  ring1: ["ring0", "ring0_s"],
  ring1_5: [],
  ring1_6: [],
  ring2: ["ring1", "ring0", "ring0_s", "ring1_5", "ring1_6"],
  ring3_9: [],
  ring3: [
    "ring2",
    "ring1",
    "ring0",
    "ring0_s",
    "ring1_5",
    "ring1_6",
    "ring3_9",
  ],
  ring3_6: [],
  general: [
    "ring3",
    "ring2",
    "ring1",
    "ring0",
    "ring0_s",
    "ring1_5",
    "ring1_6",
    "ring3_9",
    "ring3_6",
  ],
};

const processExpConfig = (configs: ExpConfig[], filter?: ExpEnv[]) => {
  const grid: TableRow = {
    rings: {
      ring0: [],
      ring0_s: [],
      ring1: [],
      ring1_5: [],
      ring1_6: [],
      ring2: [],
      ring3_9: [],
      ring3: [],
      ring3_6: [],
      general: [],
    },
  };

  const pushUniq = (k: ExpRing, e: ExpEnv) => {
    const envs = grid.rings[k];
    if (!envs.includes(e)) {
      envs.push(e);
    }
    grid.rings[k] = envs;
  };

  configs.forEach((cfg) => {
    if (
      !_.isEmpty(cfg.ring) &&
      (cfg.value === true || (cfg.value as any) === "true")
    ) {
      const env = cfg.environment || ["prod"];
      for (const r of cfg.ring) {
        for (const e of env) {
          if (!_.isEmpty(filter) && !filter.includes(e)) {
            continue;
          }
          if ((r as string).endsWith("!")) {
            const k = r.slice(0, -1) as ExpRing;
            pushUniq(k, e);
          } else {
            pushUniq(r, e);
            const lowerRings = inheritedRings[r];
            _.each(lowerRings, (lr) => pushUniq(lr, e));
          }
        }
      }
    }
  });
  return grid;
};

const toMarkdown = (table: Table) => {
  const lines = [
    "| | Area | ring0 | ring0_s | ring1 | ring1_5 | ring1_6 | ring2 | ring3_9 | ring3 | ring3_6 | general",
    "| -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- | -- |",
  ];
  _.keys(table).forEach((k) => {
    const row = table[k];
    const joinedEnvs = _.mapValues(row.rings, (r) => r.join(", "));
    const line = `| **${k}** | ${row.area ?? ""} | ${_.values(joinedEnvs).join(
      " | "
    )}`;
    lines.push(line);
  });
  return lines.join("\n");
};

const processFile = async (
  targetFile: string,
  list: ListFileResponse,
  repo: GitRepo,
  envs?: ExpEnv[]
): Promise<Table> => {
  const foundItem = list.value?.find(
    (item) => !item.isFolder && _.last(item.path.split("/")) === targetFile
  );
  if (foundItem) {
    const file = (await repo.downloadFile(foundItem.url)) as string;
    const json = JSON.parse(file);

    const keys = _.keys(json);
    const table: Table = {};
    _.each(keys, (key) => {
      const configs = json[key].configs;
      if (configs) {
        const row = processExpConfig(configs, envs);
        if (areaTags[key]) {
          row.area = areaTags[key];
        }
        table[key] = row;
      }
    });
    return table;
  }
  return {};
};

const findAllFiles = (list: ListFileResponse) => {
  const files: string[] = [];
  list.value.forEach((item) => {
    if (!item.isFolder) {
      const file = _.last(item.path.split("/"));
      files.push(file);
    }
  });
  return files;
};

const processAllFiles = async (
  targetFiles: string[],
  list: ListFileResponse,
  repo: GitRepo,
  envs?: ExpEnv[]
): Promise<AllFilesResult> => {
  const res = {};
  for (const file of targetFiles) {
    const table = await processFile(file, list, repo, envs);
    res[file] = table;
  }
  return res;
};

const getMarkdown = (result: AllFilesResult) => {
  let markdown = "";
  _.each(result, (v, file) => {
    const table = toMarkdown(v);
    markdown += `+++ ${file}\n${table}\n+++\n`;
  });
  return markdown;
};

const getHtml = (result: AllFilesResult) => {
  const markdown = getMarkdown(result);
  const md = new MarkdownIt().use(mdCollapsible, { html: true });
  const mdToHtml = md.render(markdown);
  const html = `
  <style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 32px;
  }

  details+details {
    margin: 16px 0;
  }

  details summary {
    font-weight: bold;
    color: purple;
  }

  table {
    border-collapse: collapse;
    width: 100%;
  }

  table td, table th {
    border: 1px solid #ddd;
    padding: 8px;
  }

  table tr:nth-child(even){background-color: #f2f2f2;}

  table tr:hover {background-color: #ddd;}

  table th {
    padding-top: 12px;
    padding-bottom: 12px;
    text-align: left;
    background-color: #004488;
    color: white;
  }
  </style>
  ${mdToHtml}
  `;
  return html;
};

const router = Router();

interface QueryParams {
  pat?: string;
  envs?: ExpEnv[];
  format?: "json" | "html" | "markdown";
}

router.get("/", async (req, res) => {
  const query: QueryParams = req.query;
  const PAT = query.pat || config.PAT;
  const format = query.format || "html";
  const repo = new GitRepo("teams-modular-packages", PAT);
  const body = await repo.listFiles("exp-configs/multi-window/extensibility");
  const targetFiles = findAllFiles(body);
  const result = await processAllFiles(targetFiles, body, repo, query.envs);
  if (format === "html") {
    const html = getHtml(result);
    res.contentType("text/html; charset=UTF-8");
    res.send(html);
  } else if (format === "markdown") {
    const markdown = getMarkdown(result);
    res.contentType("text/plain; charset=UTF-8");
    res.send(markdown);
  } else {
    res.contentType("application/json");
    res.send(result);
  }
  res.end();
});

const run = async (PAT: string) => {
  const repo = new GitRepo("teams-modular-packages", PAT);
  // const body = await repo.getCommitSha("15e7be713fb9b04d1df251d72a7e4cadf75440ea");
  const body = await repo.listFiles("exp-configs/multi-window/extensibility");
  const targetFiles = ["cards.json"];
  const table = await processFile(targetFiles[0], body, repo);
  console.log(table);
};

export default router;
if (require.main === module) {
  run(config.PAT);
}
