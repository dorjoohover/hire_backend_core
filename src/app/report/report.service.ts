import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { UserEntity } from '../user/entities/user.entity';
import { Role } from 'src/auth/guards/role/role.enum';
import { ExamService } from '../exam/exam.service';
import { UserAnswerService } from '../user.answer/user.answer.service';
import { ModuleRef } from '@nestjs/core';
import { REPORT_STATUS } from 'src/base/constants';
import axios from 'axios';
import { ReportLogDao } from './report.log.dao';
import http from 'http';
import { StudioDao } from './studio.dao';
import { StudioDto } from './studio.dto';
import * as puppeteer from 'puppeteer';
import { existsSync } from 'fs';
const agent = new http.Agent({
  keepAlive: false, // 👈 маш чухал
  maxSockets: 50,
});

@Injectable()
export class ReportService {
  private userAnswer: UserAnswerService;
  private webOrigin = (process.env.WEB || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  constructor(
    private moduleRef: ModuleRef,
    private dao: ReportLogDao,
    private studioDao: StudioDao,
  ) {}
  private REPORT = process.env.REPORT;
  onModuleInit() {
    // runtime-д UserAnswerService-г авна
    this.userAnswer = this.moduleRef.get(UserAnswerService, { strict: false });
  }
  async createReport(data: any, role?: number) {
    try {
      await axios.post(
        this.REPORT,
        { ...data, role },
        {
          httpAgent: agent,
          timeout: 20000, // 20 сек
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (err) {
      console.error('Report error:', err.message, data.code);
    }
  }

  // async updateStatus(body: any) {
  //   const { status, result, progress, code, id } = body;
  //   reportStore[id] = { status, progress, code, result };
  // }

  async getByCode(code: string) {
    return await this.dao.getOne(code);
  }
  async getStatus(jobId: string) {
    let report = await this.dao.getOne(jobId);

    if (!report) {
      return {
        id: null,
        status: REPORT_STATUS.PENDING,
        progress: 0,
        result: null,
        code: jobId,
      };
    }
    if (
      report.progress == 100 &&
      report.status == REPORT_STATUS.COMPLETED &&
      report.code
    ) {
      this.sendMail(report.code);
    }
    return report;
  }

  async sendMail(code: string) {
    const prev = await this.dao.getOne(code);
    if (prev.status != REPORT_STATUS.SENT) {
      await this.dao.updateByCode(code, { status: REPORT_STATUS.SENT });
      await this.userAnswer.sendEmail(code);
    }
  }

  async getCalculation(code: string) {
    try {
      const response = await axios.get(`${this.REPORT}calculate/${code}`, {
        httpAgent: agent,
        timeout: 20000,
      });

      return response?.data?.payload ?? response?.data ?? null;
    } catch (err) {
      console.error('Report calculation error:', err?.message ?? err);
      return null;
    }
  }

  private resolvePuppeteerExecutablePath() {
    const configuredPath = process.env.PUPPETEER_EXECUTABLE_PATH;

    if (configuredPath && existsSync(configuredPath)) {
      return configuredPath;
    }

    const candidates = [
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
    ];

    return candidates.find((path) => existsSync(path));
  }

  private buildStudioTemplatePdfHtml(runtime: {
    html?: string | null;
    title?: string | null;
  }) {
    const rawHtml = runtime?.html ?? '';
    const title = runtime?.title ?? 'Studio report';
    const sections = rawHtml.match(/<section[\s\S]*?<\/section>/g) ?? [];
    const pages =
      sections.length > 0
        ? sections
            .map(
              (section) => `
                <div class="pdf-page">
                  <div class="pdf-scale">${section}</div>
                </div>
              `,
            )
            .join('\n')
        : '<div class="pdf-page"><div class="pdf-scale"></div></div>';

    return `<!DOCTYPE html>
<html lang="mn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <base href="${this.webOrigin}/" />
    <title>${title}</title>
    <style>
      @page {
        size: 595pt 842pt;
        margin: 0;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }

      body {
        font-family: "Gilroy", "Arial", sans-serif;
      }

      .pdf-page {
        width: 595pt;
        height: 842pt;
        overflow: hidden;
        position: relative;
        page-break-after: always;
      }

      .pdf-page:last-child {
        page-break-after: auto;
      }

      .pdf-scale {
        width: 595px;
        height: 842px;
        transform: scale(1.3333333333);
        transform-origin: top left;
      }

      .pdf-scale > section[data-page] {
        margin: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
      }
    </style>
  </head>
  <body>
    ${pages}
  </body>
</html>`;
  }

  async renderStudioPdf(runtime: {
    html?: string | null;
    title?: string | null;
  }) {
    const executablePath = this.resolvePuppeteerExecutablePath();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({
        width: 794,
        height: 1123,
        deviceScaleFactor: 1,
      });

      await page.setContent(this.buildStudioTemplatePdfHtml(runtime), {
        waitUntil: 'networkidle0',
      });

      await page.evaluate(async () => {
        const images = Array.from(document.images);
        await Promise.all(
          images.map(
            (image) =>
              new Promise<void>((resolve) => {
                if (image.complete) {
                  resolve();
                  return;
                }

                image.addEventListener('load', () => resolve(), {
                  once: true,
                });
                image.addEventListener('error', () => resolve(), {
                  once: true,
                });
              }),
          ),
        );
      });

      const pdf = await page.pdf({
        printBackground: true,
        preferCSSPageSize: true,
        format: 'A4',
        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private normalizeTemplateKey(dto: Partial<StudioDto>) {
    const scope = dto.assessmentId ?? 'global';
    const reportType =
      dto.reportType?.toString().toLowerCase() ??
      `code-${dto.reportTypeCode ?? 'unknown'}`;

    return `studio-${scope}-${reportType}`;
  }

  public async listTemplates(filters?: {
    assessmentId?: number;
    reportType?: string;
    reportTypeCode?: number;
    limit?: number;
  }) {
    return await this.studioDao.findAll(filters);
  }

  public async getTemplate(idOrKey: number | string) {
    return await this.studioDao.getOne(idOrKey);
  }

  public async resolveTemplate(filters: {
    assessmentId: number;
    reportType?: string;
    reportTypeCode?: number;
  }) {
    const { assessmentId, reportType, reportTypeCode } = filters;

    if (reportTypeCode !== undefined && reportTypeCode !== null) {
      const exact = await this.studioDao.findLatestByAssessmentAndReportTypeCode(
        assessmentId,
        reportTypeCode,
      );

      if (exact) {
        return exact;
      }
    }

    if (reportType) {
      return await this.studioDao.findLatestByAssessmentAndReportType(
        assessmentId,
        reportType,
      );
    }

    const [latest] = await this.studioDao.findAll({
      assessmentId,
      limit: 1,
    });

    return latest ?? null;
  }

  public async saveTemplate(dto: Partial<StudioDto>, userId = 0) {
    const reportType = dto.reportType?.trim();

    if (!reportType) {
      throw new Error('reportType заавал шаардлагатай.');
    }

    let current = dto.id ? await this.studioDao.getOne(dto.id) : null;

    if (!current && dto.assessmentId && dto.reportTypeCode !== undefined) {
      current = await this.studioDao.findLatestByAssessmentAndReportTypeCode(
        dto.assessmentId,
        dto.reportTypeCode,
      );
    }

    if (!current && dto.assessmentId) {
      current = await this.studioDao.findLatestByAssessmentAndReportType(
        dto.assessmentId,
        reportType,
      );
    }

    if (!current && dto.key) {
      current = await this.studioDao.getOne(dto.key);
    }

    const createdUser =
      current?.createdUser ?? dto.createdUser ?? dto.updatedUser ?? userId ?? 0;
    const updatedUser = dto.updatedUser ?? userId ?? current?.updatedUser ?? 0;

    const payload: StudioDto = {
      id: current?.id,
      key: current?.key ?? this.normalizeTemplateKey(dto),
      assessmentId: dto.assessmentId ?? current?.assessmentId ?? null,
      reportType,
      reportTypeCode:
        dto.reportTypeCode ?? current?.reportTypeCode ?? null,
      version: current ? (current.version ?? 1) + 1 : (dto.version ?? 1),
      renderer: dto.renderer ?? current?.renderer ?? 'absolute-html-v2',
      name: dto.name ?? current?.name ?? 'Untitled studio template',
      description:
        dto.description ?? current?.description ?? null,
      canvas: dto.canvas ?? current?.canvas ?? null,
      pages: dto.pages ?? current?.pages ?? null,
      defaultBody:
        dto.defaultBody ?? current?.defaultBody ?? null,
      detailGrouping:
        dto.detailGrouping ?? current?.detailGrouping ?? null,
      logicNotes: dto.logicNotes ?? current?.logicNotes ?? null,
      variables: dto.variables ?? current?.variables ?? null,
      elements: dto.elements ?? current?.elements ?? null,
      previewData: dto.previewData ?? current?.previewData ?? null,
      status: dto.status ?? current?.status ?? 1,
      createdUser,
      updatedUser,
    };

    if (current?.id) {
      return await this.studioDao.update(current.id, payload);
    }

    return await this.studioDao.create(payload);
  }
}
