import { Injectable } from '@nestjs/common';
import { FormuleDto } from './formule.dto';
import { BaseService } from 'src/base/base.service';
import { DataSource, Repository } from 'typeorm';
import { FormulaEntity } from './formule.entity';
import { UserAnswerDao } from '../user.answer/user.answer.dao';
import { QuestionAnswerCategoryDao } from '../question/dao/question.answer.category.dao';
import { AssessmentFormulaEntity } from '../assessment/entities/assessment.formule.entity';

@Injectable()
export class FormuleService extends BaseService {
  private db: Repository<FormulaEntity>;
  private assFormula: Repository<AssessmentFormulaEntity>;
  constructor(
    private answerCategoryDao: QuestionAnswerCategoryDao,
    private dataSource: DataSource,
    private userAnswerDao: UserAnswerDao,
  ) {
    super();
    this.db = this.dataSource.getRepository(FormulaEntity);
    this.assFormula = this.dataSource.getRepository(AssessmentFormulaEntity);
  }

  public async create(dto: FormuleDto, user: number) {
    try {
      const { subFormulas, assessment, ...body } = dto;
      const res = this.db.create({ ...body, createdUser: user });
      await this.db.save(res);

      if (assessment) {
        const formule = this.assFormula.create({
          assessment: { id: assessment },
          formule: {
            id: res.id,
          },
          parent: null,
        });
        await this.assFormula.save(formule);
        if (subFormulas && subFormulas.length > 0) {
          for (const subFormula of subFormulas) {
            console.log(subFormula);
            if (!subFormula.is_calculated) continue;

            const {
              assessment,
              subFormulas: _,
              category,
              ...body
            } = subFormula;

            const child = this.db.create({ ...body, createdUser: user });
            await this.db.save(child);

            const formula = this.assFormula.create({
              assessment: { id: assessment },
              formule: { id: child.id },
              parent: { id: formule.id },
              question_category: category ? { id: category } : null,
            });

            await this.assFormula.save(formula);
          }
        }
      }

      return res.id;
    } catch (error) {
      console.log(error, 'formule dao');
    }
  }

  public async findAll() {
    return await this.db.find();
  }

  public async findOne(id: number) {
    return await this.db.findOne({ where: { id: id } });
  }

  async aggregate(dto: FormulaEntity, w: string): Promise<any[]> {
    try {
      const { groupBy, aggregations, filters, limit, order, sort } = dto;

      let select = '';
      let where = w;
      let group = '';
      let l = limit;
      let o = order;

      // Apply JOINs
      // queryBuilder.leftJoinAndSelect('sales.productDetails', 'product');

      // Apply filters
      if (filters) {
        Object.keys(filters).forEach((key) => {
          if (where != '') where += ' and ';
          where += `${key} = ${filters[key]}`;
        });
      }

      if (groupBy && groupBy.length > 0) {
        group = groupBy.map((g) => `"${g}"`).join(', ');
      }

      if (groupBy && groupBy.length > 0) {
        let g = groupBy.map((g) => `"${g}"`).join(', ');
        if (g) select += g;
      }

      // Apply aggregations
      aggregations.forEach((agg) => {
        const alias = `${agg.operation.toLowerCase()}_${agg.field.replace('.', '_')}`;
        if (select != '') select += ', ';
        select += `${agg.operation}(${agg.field}) as "${agg.field}"`;
      });
      let query = `select ${select} from "userAnswer"`;
      if (where) query += ` where ${where}`;
      if (group) query += ` group by ${group}`;
      if (o) query += ` order by "${o}" ${sort ? 'desc' : 'asc'}`;
      if (l) query += ` limit  ${l}`;
      const res = await this.userAnswerDao.query(query);
      return res;
    } catch (error) {
      console.log(error);
    }
  }

  async calculate(formulaId: number, where: number) {
    const formula = await this.db.findOne({
      where: { id: formulaId },
    });
    let w = `"examId" = ${where}`;
    const res = await this.aggregate(formula, w);
    if (res.length <= 1) return res;
    const response = await Promise.all(
      res.map(async (r) => {
        // let sum = parseInt(r.sum);

        // return { ...r, sum: sum };
        let aCate = r.answerCategoryId;
        aCate = await this.answerCategoryDao.findOne(+aCate);
        let sum =
          formula.aggregations?.find((a) => a.operation.includes('AVG')) !=
          undefined
            ? Math.round(parseFloat(r.point) * 100) / 100
            : parseInt(r.point);
        return {
          point: sum,
          aCate: aCate?.name ?? aCate,
          parent: aCate.parent,
          formula: formula.aggregations,
        };
      }),
    );
    return response.sort((a, b) => b.point - a.point);
    if (!formula) {
      throw new Error('Formula not found');
    }

    // Extract formula details
    const { formula: formulaString, variables } = formula;

    // Map input data to variables
    const inputVariables = variables.map((v) => formula.variables[v]);

    // Check for missing inputs
    if (inputVariables.some((v) => v === undefined)) {
      throw new Error(
        `Missing input variables. Required: ${variables.join(', ')}`,
      );
    }

    // Safely evaluate the formula using Function
    try {
      const result = new Function(
        ...variables.map(String),
        `return ${formulaString};`,
      )(...inputVariables);
      return result;
    } catch (error) {
      throw new Error('Error evaluating formula: ' + error.message);
    }
  }
}
