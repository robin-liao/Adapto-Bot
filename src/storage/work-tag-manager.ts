import { UserDataTable } from "./user-table";
import { WorkTag, WorkTagTable, WorkTagUserData } from "./work-tag-table";
import { v4 as uuid } from "uuid";
import _ from "lodash";

export class WorkTagManager {
  private readonly userTable = new UserDataTable(this.userId);
  private readonly tagTable = new WorkTagTable(this.userId);

  constructor(private userId: string) {}

  public async updateTagNote(tag: string, note: string) {
    const [tagId, tags] = await this.getTagId(tag);
    if (tagId) {
      await this.tagTable.update(tagId, { note });
    } else {
      tags.push(tag);
      await this.userTable.update({ tags });
      await this.tagTable.update(uuid(), { tag, note });
    }
  }

  public async tagConversation(tag: string, convLink: string) {
    const convLinks =
      (await this.tagTable.get(tag, "convLinks"))?.convLinks ?? [];
    if (!convLinks.includes(convLink)) {
      convLinks.push(convLink);
    }

    const [tagId, tags] = await this.getTagId(tag);
    if (tagId) {
      await this.tagTable.update(tagId, { convLinks });
    } else {
      tags.push(tag);
      await this.userTable.update({ tags });
      await this.tagTable.update(uuid(), { tag, convLinks });
    }
  }

  public async createTag(
    tag: string,
    entry: Partial<Omit<WorkTagUserData, "tag">>
  ) {
    const tags = (await this.userTable.get("tags"))?.tags ?? [];
    tags.push(tag);
    await this.userTable.update({ tags });
    await this.tagTable.update(uuid(), { tag, ...entry });
  }

  public async removeConversationLink(tag: string, convLink: string) {
    const entry = await this.tagTable.get(tag, "convLinks", "id");
    const convLinks = entry?.convLinks;
    if (entry.id && convLinks?.includes(convLink)) {
      _.pull(convLinks, convLink);
      this.tagTable.update(entry.id, { convLinks });
    }
  }

  public async listTags<K extends keyof WorkTag>(
    ...proj: K[]
  ): Promise<{ [R in K]: WorkTag[R] }[] | undefined> {
    return this.tagTable.getAll(...proj);
  }

  public async deleteTag(tag: string) {
    const [tagId, tags] = await this.getTagId(tag);
    if (tagId) {
      _.pull(tags, tag);
      await this.userTable.update({ tags });
      await this.tagTable.delete(tagId);
    }
  }

  private async getTagId(tag: string): Promise<[string, string[]]> {
    const tags = (await this.userTable.get("tags"))?.tags ?? [];
    const exist = tags.find((x) => x.toLowerCase() === tag.toLowerCase());
    const tagId = (await this.tagTable.get(tag, "id"))?.id;
    return exist && tagId ? [tagId, tags] : undefined;
  }
}

if (require.main === module) {
  (async () => {
    const userId =
      "29:1E0NZYNZFQOCUI8zM9NY_EhlCsWgNbLGTHUNdBVX2ob8SLjhltEhQMPi07Gr6MLScFeS8SrKH1WGvJSiVKThnyw";
    const mang = new WorkTagManager(userId);
    await mang.updateTagNote("ams-image", "AMS / URLP image issues");

    const convLink =
      "https://teams.microsoft.com/l/message/19:PGQbUW-A3Hpu_tCZBfZ0LTO47c1zJLgC47v4eqp_rRE1@thread.tacv2/1636635160739";
    await mang.tagConversation("ams-image", convLink);
  })();
}
