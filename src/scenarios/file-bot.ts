import { TurnContext } from "botbuilder-core";
import { FileDownloadInfo, FileConsentCardResponse } from "botframework-schema";
import { IBotFileHandler } from "../bot-file-helper";
import { IScenarioBuilder, ITeamsScenario } from "../teams-bot";
import request from "request";
import * as fs from "fs";
import config from "../config";
import { CardGenerator } from "../card-gen";

/**
 * Define data type for accept context
 */
interface ConsentContext {
  filename: string;
}

export class FileBot implements ITeamsScenario, IBotFileHandler {
  private readonly fileFolder = config.dataPrefix + "/file-download";

  public accept(teamsBot: IScenarioBuilder) {
    teamsBot.registerFileHandler(this);
    this.registerTextCommands(teamsBot);
  }

  public async onMessageWithFileDownloadInfo(
    ctx: TurnContext,
    files: FileDownloadInfo[]
  ): Promise<void> {
    for (const file of files) {
      await ctx.sendActivity({
        textFormat: "xml",
        text: `<b>Received File</b> <pre>${JSON.stringify(
          file,
          null,
          2
        )}</pre>`,
      });
      let filename: string;
      const err = await new Promise((resolve, reject) => {
        const r = request(file.downloadUrl);
        r.on("response", (res) => {
          const regexp = /filename=\"(.*)\"/gi;
          filename = regexp.exec(res.headers["content-disposition"])[1];
          res.pipe(fs.createWriteStream(`${this.fileFolder}/${filename}`));
        });
        r.on("error", (e) => resolve(e));
        r.on("complete", (res) => resolve(true));
      });
      if (!err && !!filename) {
        await ctx.sendActivity({
          textFormat: "xml",
          text: `Complete downloading <b>${filename}</b>`,
        });
      }
    }
  }

  public async handleTeamsFileConsentAccept(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void> {
    const context: ConsentContext = fileConsentCardResponse.context;
    const fname = `${this.fileFolder}/${context.filename}`;
    const fileInfo = fs.statSync(fname);
    const file = Buffer.from(fs.readFileSync(fname, "binary"), "binary");

    await ctx.sendActivity({
      textFormat: "xml",
      text: `Uploading <b>${context.filename}</b>`,
    });

    const result = new Promise<any>((resolve, reject) => {
      request.put(
        {
          uri: fileConsentCardResponse.uploadInfo.uploadUrl,
          headers: {
            "Content-Length": fileInfo.size,
            "Content-Range": `bytes 0-${fileInfo.size - 1}/${fileInfo.size}`,
          },
          encoding: null,
          body: file,
        },
        async (err, res) => {
          if (err) {
            reject(err);
          } else {
            const data = Buffer.from(res.body, "binary").toString("utf8");
            resolve(JSON.parse(data));
          }
        }
      );
    });

    try {
      await this.fileUploadCompleted(ctx, fileConsentCardResponse, result);
    } catch (err) {
      await this.fileUploadFailed(ctx, err);
    }
  }

  public async handleTeamsFileConsentDecline(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void> {
    const context: ConsentContext = fileConsentCardResponse.context;
    await ctx.sendActivity({
      textFormat: "xml",
      text: `Declined. We won't upload file <b>${context.filename}</b>.`,
    });
  }

  private registerTextCommands(teamsBot: IScenarioBuilder) {
    teamsBot.registerTextCommand(/^file/i, async (ctx) => {
      const filename = "icon-color.png";
      const fileinfo = fs.statSync(`${this.fileFolder}/${filename}`);
      await this.sendFileCard(ctx, filename, fileinfo.size);
    });
  }

  private async sendFileCard(
    ctx: TurnContext,
    filename: string,
    filesize: number
  ) {
    const fileCard = CardGenerator.file.createConsentCard(
      {
        description: "This is the file I want to send you",
        sizeInBytes: filesize,
        acceptContext: {
          filename,
        } as ConsentContext,
        declineContext: {
          filename,
        } as ConsentContext,
      },
      filename
    );
    await ctx.sendActivities([{ attachments: [fileCard] }]);
  }

  private async fileUploadCompleted(
    ctx: TurnContext,
    query: FileConsentCardResponse,
    response: any
  ) {
    const downloadCard = CardGenerator.file.createInfoCard(
      {
        uniqueId: query.uploadInfo.uniqueId,
        fileType: query.uploadInfo.fileType,
      },
      query.uploadInfo.name,
      query.uploadInfo.contentUrl
    );
    await ctx.sendActivities([
      {
        textFormat: "xml",
        text: `<b>File Upload Completed</b> <pre>${JSON.stringify(
          response,
          null,
          2
        )}</pre>`,
      },
      {
        textFormat: "xml",
        text: `Your file <b>${query.context.filename}</b> is ready to download`,
        attachments: [downloadCard],
      },
    ]);
  }

  private async fileUploadFailed(ctx: TurnContext, error: any) {
    await ctx.sendActivity({
      textFormat: "xml",
      text: `<b>File Upload Failed</b> <pre>${JSON.stringify(
        error,
        null,
        2
      )}</pre>`,
    });
  }
}
