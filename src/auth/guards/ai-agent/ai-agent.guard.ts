import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

// AI agent-аас дуудагдах endpoint-уудыг хамгаална (жиш: pdf-template/ai-export/:code).
// Studio/web-ийн адил хэрэглэгчийн JWT биш — тогтмол API key (core/.env-ийн
// AI_AGENT_KEY)-аар шалгана. Route дээр @Public() (global JwtAuthGuard-ыг
// алгасах, эс тэгвээс Authorization header-ийг JWT гэж уншиж 401 өгнө) +
// @UseGuards(AiAgentGuard) хамт ашиглана.
//
// Хүлээж авах header (аль нэгийг нь):
//   Authorization: Bearer <AI_AGENT_KEY>
//   x-ai-agent-key: <AI_AGENT_KEY>
@Injectable()
export class AiAgentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const expected = process.env.AI_AGENT_KEY;

    // Тохируулаагүй бол "хамгаалалтгүй нээлттэй" гэсэн буруу төлөвт унахгүйн
    // тулд бүрмөсөн хаана (fail closed).
    if (!expected) {
      throw new UnauthorizedException('AI agent access is not configured.');
    }

    const authHeader = req.headers?.['authorization'] as string | undefined;
    const rawKeyHeader = req.headers?.['x-ai-agent-key'] as string | undefined;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : rawKeyHeader;

    if (!token || token !== expected) {
      throw new UnauthorizedException('Invalid AI agent key.');
    }

    return true;
  }
}
