import {
  TurnContext,
  FileDownloadInfo,
  FileConsentCardResponse,
} from "botbuilder";

export interface IBotFileHandler {
  onMessageWithFileDownloadInfo?(
    ctx: TurnContext,
    files: FileDownloadInfo[]
  ): Promise<void>;

  handleTeamsFileConsentAccept?(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void>;

  handleTeamsFileConsentDecline?(
    ctx: TurnContext,
    fileConsentCardResponse: FileConsentCardResponse
  ): Promise<void>;
}

export const DOWNLOAD_INFO_CONTENT_TYPE =
  "application/vnd.microsoft.teams.file.download.info";
