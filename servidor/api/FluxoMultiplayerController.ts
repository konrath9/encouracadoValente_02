import { Router } from "express";
import { inject, injectable, postConstruct } from "inversify";
import "reflect-metadata";
import { LiteralServico } from "../literais/LiteralServico";
import { PostLoginUsuario } from "../modelos/PostLoginUsuario";
import { MdExcecao } from "./MdExcecao";
import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import { MdUsuarioLogado } from "../modelos/MdUsuarioLogado";
import { PostCadastroUsuario } from "../modelos/PostCadastroUsuario";
import { StringUteis } from "../uteis/StringUteis";
import { DbUsuario } from "../modelos/DbUsuario";
import { ConfigBack } from "../ConfigBack";
import { UsuarioRepositorio } from "../repositorio/UsuarioRepositorio";
import { PostNovaCompra } from "../modelos/PostNovaCompra";
import { TemaRepositorio } from "../repositorio/TemaRepositorio";
import { NavioTemaRepositorio } from "../repositorio/NavioTemaRepositorio";
import { DbTema } from "../modelos/DbTema";
import { ControllerBase } from "./ControllerBase";
import { MdDetalheTema } from "../modelos/MdDetalheTema";
import { MdResumoTema } from "../modelos/MdResumoTema";
import { PutTema } from "../modelos/PutTema";
import { UtilUrl } from "../UtilUrl";
import { DbNavioTema } from "../modelos/DbNavioTema";
import { DbCompra } from "../modelos/DbCompra";
import { DbSalaFluxo } from "../modelos/DbSalaFluxo";
import { MdDetalheNavioTema } from "../modelos/MdDetalheNavioTema";
import { PutPosicaoEstrategia } from "../modelos/PutPosicaoEstrategia";
import { SalaFluxoRepositorio } from "../repositorio/SalaFluxoRepositorio";
import { PosicaoFluxoRepositorio } from "../repositorio/PosicaoFluxoRepositorio";
import { DbPosicaoFluxo } from "../modelos/DbPosicaoFluxo";
import { TiroFluxoRepositorio } from "../repositorio/TiroFluxoRepositorio";
import { DbTiroFluxo } from "../modelos/DbTiroFluxo";
import { LiteralOrientacao } from "../literais/LiteralOrientacao";
import { MdTiro } from "../modelos/MdTiro";
import { MdProgressoNaviosJogador } from "../modelos/MdProgressoNaviosJogador";
import { MdSalaDetalhada } from "../modelos/MdSalaDetalhada";
import { PostTiroFluxo } from "../modelos/PostTiroFluxo";
import { CompraRepositorio } from "../repositorio/CompraRepositorio";

@injectable()
class FluxoMultiplayerController extends ControllerBase {
    private _temaRepositorio: TemaRepositorio
    private _navioTemaRepositorio: NavioTemaRepositorio
    private _usuarioRepositorio: UsuarioRepositorio
    private _salaFluxoRepositorio: SalaFluxoRepositorio
    private _posicaoFluxoRepositorio: PosicaoFluxoRepositorio
    private _tiroFluxoRepositorio: TiroFluxoRepositorio
    private _compraRepositorio: CompraRepositorio
    constructor(
        @inject(LiteralServico.ConfigBack) configBack: ConfigBack,
        @inject(LiteralServico.TemaRepositorio) temaRepositorio: TemaRepositorio,
        @inject(LiteralServico.NavioTemaRepositorio) navioTemaRepositorio: NavioTemaRepositorio,
        @inject(LiteralServico.UsuarioRepositorio) usuarioRepositorio: UsuarioRepositorio,
        @inject(LiteralServico.SalaFluxoRepositorio) salaFluxoRepositorio: SalaFluxoRepositorio,
        @inject(LiteralServico.PosicaoFluxoRepositorio) posicaoFluxoRepositorio: PosicaoFluxoRepositorio,
        @inject(LiteralServico.TiroFluxoRepositorio) tiroFluxoRepositorio: TiroFluxoRepositorio,
        @inject(LiteralServico.CompraRepositorio) compraRepositorio: CompraRepositorio
    ) {
        super(configBack);
        this._configBack = configBack;
        this._temaRepositorio = temaRepositorio;
        this._navioTemaRepositorio = navioTemaRepositorio;
        this._usuarioRepositorio = usuarioRepositorio;
        this._salaFluxoRepositorio = salaFluxoRepositorio;
        this._posicaoFluxoRepositorio = posicaoFluxoRepositorio;
        this._tiroFluxoRepositorio = tiroFluxoRepositorio;
        this._compraRepositorio = compraRepositorio;
        this.router = Router();
        this.router.put('/atualizarEstrategias', async (req, res) => {
            try {
                const idUsuarioLogado = await this.obterIdUsuarioLogado(req);
                await this.atualizarEstrategias(req.body, idUsuarioLogado);
                res.send();
            } catch (exc) {
                MdExcecao.enviarExcecao(req, res, exc);
            }
        });
        this.router.get('/detalharSala', async (req, res) => {
            try {
                const idUsuarioLogado = await this.obterIdUsuarioLogado(req);
                const salaDetalhada = await this.detalharSala(idUsuarioLogado);
                res.send(salaDetalhada);
            } catch (exc) {
                MdExcecao.enviarExcecao(req, res, exc);
            }
        });
        this.router.get('/detalharProgressoJogadorLogado', async (req, res) => {
            try {
                const idUsuarioLogado = await this.obterIdUsuarioLogado(req);
                const progressoJogadorLogado = await this.detalharProgressoJogadorLogado(idUsuarioLogado);
                res.send(progressoJogadorLogado);
            } catch (exc) {
                MdExcecao.enviarExcecao(req, res, exc);
            }
        });
        this.router.get('/detalharProgressoJogadorOponente', async (req, res) => {
            try {
                const idUsuarioLogado = await this.obterIdUsuarioLogado(req);
                const progressoJogadorOponente = await this.detalharProgressoJogadorOponente(idUsuarioLogado);
                res.send(progressoJogadorOponente);
            } catch (exc) {
                MdExcecao.enviarExcecao(req, res, exc);
            }
        });
        this.router.post('/adicionarTiro', async (req, res) => {
            try {
                const idUsuarioLogado = await this.obterIdUsuarioLogado(req);
                const idTiroInserido = await this.adicionarTiro(req.body, idUsuarioLogado);
                res.send(idTiroInserido);
            } catch (exc) {
                MdExcecao.enviarExcecao(req, res, exc);
            }
        });
    }

    // codifique as actions:

    // autorizado
    // put
    atualizarEstrategias = async (estrategias: PutPosicaoEstrategia[], idUsuarioLogado: string): Promise<void> => {
        
        // Validaçoes
        const salaUsuarioLogadoDb = await this._salaFluxoRepositorio.selectByUsuarioJogandoOrDefault(idUsuarioLogado);
        if (salaUsuarioLogadoDb == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Voce ainda nao entrou em uma sala';
            throw ex;
        }
        
        // Informar que o jogador carregou suas estrategias
        let salaUsuarioAtual = new DbSalaFluxo();
        salaUsuarioAtual = salaUsuarioLogadoDb;
        if (salaUsuarioAtual.idPlayer1 == idUsuarioLogado)
            salaUsuarioAtual.player1CarregouFluxo = true;
        else
            salaUsuarioAtual.player2CarregouFluxo = true;
        
        // Parse cada resultado
        let posicoesFluxo: DbPosicaoFluxo[] = [];
        for (let iEstrategia of estrategias) {
            let posicaoFluxoParaPush = new DbPosicaoFluxo();
            posicaoFluxoParaPush.id = StringUteis.gerarNovoIdDe24Caracteres();
            posicaoFluxoParaPush.numeroRecuperacaoUrlSalaFluxo = salaUsuarioLogadoDb.numeroRecuperacaoUrl;
            posicaoFluxoParaPush.idUsuarioEnviador = idUsuarioLogado;
            posicaoFluxoParaPush.tamanhoQuadradosNavio = iEstrategia.tamanhoQuadradosNavio;
            posicaoFluxoParaPush.numeroLinha = iEstrategia.numeroLinha;
            posicaoFluxoParaPush.numeroColuna = iEstrategia.numeroColuna;
            posicaoFluxoParaPush.orientacao = iEstrategia.orientacao;
            posicoesFluxo.push(posicaoFluxoParaPush);
        }
        // console.table(posicoesFluxo);
        
        // Salvar no mongodb
        await this._salaFluxoRepositorio.updatePorOperador(salaUsuarioAtual, idUsuarioLogado);
        await this._posicaoFluxoRepositorio.updateByNumeroRecuperacaoUrlSalaQueTenhaIdUsuario(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioLogado, posicoesFluxo, idUsuarioLogado);
    }
    
    private eTiroAcertado = (tiro: DbTiroFluxo, estrategias: DbPosicaoFluxo[]): boolean => {
        
        // Posicoes Totais das estrategias
        const posicoesTotais: MdTiro[] = [];
        for (let iEstrategia of estrategias) {
            if (iEstrategia.orientacao == LiteralOrientacao.Esquerda) {
                let indexTamanho = 0;
                for (let _ of Array(iEstrategia.tamanhoQuadradosNavio)) {
                    posicoesTotais.push({ numeroLinha: iEstrategia.numeroLinha, numeroColuna: iEstrategia.numeroColuna - indexTamanho, acertou: false });
                    indexTamanho++;
                }
            }
            if (iEstrategia.orientacao == LiteralOrientacao.Direita) {
                let indexTamanho = 0;
                for (let _ of Array(iEstrategia.tamanhoQuadradosNavio)) {
                    posicoesTotais.push({ numeroLinha: iEstrategia.numeroLinha, numeroColuna: iEstrategia.numeroColuna + indexTamanho, acertou: false });
                    indexTamanho++;
                }
            }
            if (iEstrategia.orientacao == LiteralOrientacao.Cima) {
                let indexTamanho = 0;
                for (let _ of Array(iEstrategia.tamanhoQuadradosNavio)) {
                    posicoesTotais.push({ numeroLinha: iEstrategia.numeroLinha - indexTamanho, numeroColuna: iEstrategia.numeroColuna, acertou: false });
                    indexTamanho++;
                }
            }
            if (iEstrategia.orientacao == LiteralOrientacao.Baixo) {
                let indexTamanho = 0;
                for (let _ of Array(iEstrategia.tamanhoQuadradosNavio)) {
                    posicoesTotais.push({ numeroLinha: iEstrategia.numeroLinha + indexTamanho, numeroColuna: iEstrategia.numeroColuna, acertou: false });
                    indexTamanho++;
                }
            }
        }
        
        // Verificar se algum tiro ta batendo
        return posicoesTotais.some(x => x.numeroLinha == tiro.numeroLinha && x.numeroColuna == tiro.numeroColuna);
    }
    
    private eNavioAfundadoPorCompleto = (estrategia: DbPosicaoFluxo, tiros: DbTiroFluxo[]) => {
        
        // Posicoes Totais das estrategias
        const posicoesTotais: MdTiro[] = [];
        if (estrategia.orientacao == LiteralOrientacao.Esquerda) {
            let indexTamanho = 0;
            for (let _ of Array(estrategia.tamanhoQuadradosNavio)) {
                let posicaoTotalParaPush: MdTiro = { numeroLinha: estrategia.numeroLinha, numeroColuna: estrategia.numeroColuna - indexTamanho, acertou: false };
                posicaoTotalParaPush.acertou = tiros.some(x => x.numeroLinha == posicaoTotalParaPush.numeroLinha && x.numeroColuna == posicaoTotalParaPush.numeroColuna);
                posicoesTotais.push(posicaoTotalParaPush);
                indexTamanho++;
            }
        }
        if (estrategia.orientacao == LiteralOrientacao.Direita) {
            let indexTamanho = 0;
            for (let _ of Array(estrategia.tamanhoQuadradosNavio)) {
                let posicaoTotalParaPush: MdTiro = { numeroLinha: estrategia.numeroLinha, numeroColuna: estrategia.numeroColuna + indexTamanho, acertou: false };
                posicaoTotalParaPush.acertou = tiros.some(x => x.numeroLinha == posicaoTotalParaPush.numeroLinha && x.numeroColuna == posicaoTotalParaPush.numeroColuna);
                posicoesTotais.push(posicaoTotalParaPush);
                indexTamanho++;
            }
        }
        if (estrategia.orientacao == LiteralOrientacao.Cima) {
            let indexTamanho = 0;
            for (let _ of Array(estrategia.tamanhoQuadradosNavio)) {
                let posicaoTotalParaPush: MdTiro = { numeroLinha: estrategia.numeroLinha - indexTamanho, numeroColuna: estrategia.numeroColuna, acertou: false };
                posicaoTotalParaPush.acertou = tiros.some(x => x.numeroLinha == posicaoTotalParaPush.numeroLinha && x.numeroColuna == posicaoTotalParaPush.numeroColuna);
                posicoesTotais.push(posicaoTotalParaPush);
                indexTamanho++;
            }
        }
        if (estrategia.orientacao == LiteralOrientacao.Baixo) {
            let indexTamanho = 0;
            for (let _ of Array(estrategia.tamanhoQuadradosNavio)) {
                let posicaoTotalParaPush: MdTiro = { numeroLinha: estrategia.numeroLinha + indexTamanho, numeroColuna: estrategia.numeroColuna, acertou: false };
                posicaoTotalParaPush.acertou = tiros.some(x => x.numeroLinha == posicaoTotalParaPush.numeroLinha && x.numeroColuna == posicaoTotalParaPush.numeroColuna);
                posicoesTotais.push(posicaoTotalParaPush);
                indexTamanho++;
            }
        }
        
        // Verificar se todas as posicoes estao acertadas
        return posicoesTotais.every(x => x.acertou);
    }
    
    // autorizado
    // get
    detalharSala = async (idUsuarioLogado: string): Promise<MdSalaDetalhada> => {
        
        // Validaçoes
        const salaDb = await this._salaFluxoRepositorio.selectByUsuarioJogandoOrDefault(idUsuarioLogado);
        if (salaDb == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Voce ainda nao entrou em uma sala';
            throw ex;
        }
        const idUsuarioOponente = idUsuarioLogado == salaDb.idPlayer1 ? salaDb.idPlayer2 : salaDb.idPlayer1;
        if (idUsuarioOponente == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Oponente nao encontrado';
            throw ex;
        }
        const idTemaInimigo = (await this._compraRepositorio.selectCompraEquipadaByIdUsuarioOrDefault(idUsuarioOponente))?.idTema ?? '';
        
        let totalJogadores = 0;
        if (salaDb.idPlayer1 != null)
            totalJogadores++;
        if (salaDb.idPlayer2 != null)
            totalJogadores++;
            
        if (salaDb.idPlayer1 == idUsuarioLogado)
            return { numeroRecuperacaoUrl: salaDb.numeroRecuperacaoUrl, totalJogadores: totalJogadores, oponenteCarregouFluxo: salaDb.player2CarregouFluxo, idTemaInimigo: idTemaInimigo };
        else
            return { numeroRecuperacaoUrl: salaDb.numeroRecuperacaoUrl, totalJogadores: totalJogadores, oponenteCarregouFluxo: salaDb.player1CarregouFluxo, idTemaInimigo: idTemaInimigo };
    }
    
    // autorizado
    // get
    detalharProgressoJogadorLogado = async (idUsuarioLogado: string): Promise<MdProgressoNaviosJogador> => {
        
        // DbSalaFluxo 1 <- N DbPosicaoFluxo
        // DbSalaFluxo 1 <- N DbTiroFluxo
        
        // Validaçoes
        const salaUsuarioLogadoDb = await this._salaFluxoRepositorio.selectByUsuarioJogandoOrDefault(idUsuarioLogado);
        if (salaUsuarioLogadoDb == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Voce ainda nao entrou em uma sala';
            throw ex;
        }
        const idUsuarioOponente = idUsuarioLogado == salaUsuarioLogadoDb.idPlayer1 ? salaUsuarioLogadoDb.idPlayer2 : salaUsuarioLogadoDb.idPlayer1;
        if (idUsuarioOponente == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Oponente nao encontrado';
            throw ex;
        }
        
        // Buscar no mongodb
        const tirosFluxoDb = await this._tiroFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioLogado);
        const posicoesFluxoDb = await this._posicaoFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioLogado);
        const tirosFluxoDbInimigo = await this._tiroFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        const posicoesFluxoDbInimigo = await this._posicaoFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        
        let progressoJogadorLogado = new MdProgressoNaviosJogador();
        progressoJogadorLogado.naviosTotais = posicoesFluxoDb.map(iPosicaoFluxo => {
            return { tamanhoQuadradosNavio: iPosicaoFluxo.tamanhoQuadradosNavio, numeroLinha: iPosicaoFluxo.numeroLinha, numeroColuna: iPosicaoFluxo.numeroColuna, orientacao: iPosicaoFluxo.orientacao };
        });
        progressoJogadorLogado.tiros = tirosFluxoDb.map(iTiroFluxo => {
            return { numeroLinha: iTiroFluxo.numeroLinha, numeroColuna: iTiroFluxo.numeroColuna, acertou: this.eTiroAcertado(iTiroFluxo, posicoesFluxoDb) };
        });
        
        // Calcular de quem e a vez
        let idTiroDbMaisRecente = '';
        if ([...tirosFluxoDb, ...tirosFluxoDbInimigo].length == 0) {
            progressoJogadorLogado.estaNaVezDoJogador = salaUsuarioLogadoDb.idPlayer1 == idUsuarioLogado;
        } else {
            let idJogadorAlvoTiroMaisRecente = '';
            let horaMaisRecente = Number.MIN_SAFE_INTEGER;
            for (let iTiro of [...tirosFluxoDb, ...tirosFluxoDbInimigo]) {
                if (horaMaisRecente < iTiro.horaInclusao.getTime()) {
                    idJogadorAlvoTiroMaisRecente = iTiro.idUsuarioAlvo;
                    idTiroDbMaisRecente = iTiro.id;
                    horaMaisRecente = iTiro.horaInclusao.getTime();
                }
            }
            progressoJogadorLogado.estaNaVezDoJogador = idJogadorAlvoTiroMaisRecente == idUsuarioLogado;
        }
        
        // Verificar se foi um tiro certeiro - se sim, inveter o valor logico pois assim continua na vez de quem atirou
        if ([...tirosFluxoDb, ...tirosFluxoDbInimigo].length > 0) {
            if (progressoJogadorLogado.estaNaVezDoJogador) {
                
                // Ultimo tiro foi do inimigo, entao verificar entre os navios do jogador logado
                const ultimoTiroDbInimigo = [...tirosFluxoDb, ...tirosFluxoDbInimigo].find(x => x.id == idTiroDbMaisRecente);
                if (ultimoTiroDbInimigo != undefined && this.eTiroAcertado(ultimoTiroDbInimigo, posicoesFluxoDb))
                    progressoJogadorLogado.estaNaVezDoJogador = !progressoJogadorLogado.estaNaVezDoJogador;
            } else {
                
                // Ultimo tiro foi do jogador logado, entao verificar entre os navios do inimigo
                const ultimoTiroDbJogadorLogado = [...tirosFluxoDb, ...tirosFluxoDbInimigo].find(x => x.id == idTiroDbMaisRecente);
                if (ultimoTiroDbJogadorLogado != undefined && this.eTiroAcertado(ultimoTiroDbJogadorLogado, posicoesFluxoDbInimigo))
                    progressoJogadorLogado.estaNaVezDoJogador = !progressoJogadorLogado.estaNaVezDoJogador;
            }
        }
        
        return progressoJogadorLogado;
    }
    
    // autorizado
    // get
    detalharProgressoJogadorOponente = async (idUsuarioLogado: string): Promise<MdProgressoNaviosJogador> => {
        
        // DbSalaFluxo 1 <- N DbPosicaoFluxo
        // DbSalaFluxo 1 <- N DbTiroFluxo
        
        // Validaçoes
        const salaUsuarioLogadoDb = await this._salaFluxoRepositorio.selectByUsuarioJogandoOrDefault(idUsuarioLogado);
        if (salaUsuarioLogadoDb == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Voce ainda nao entrou em uma sala';
            throw ex;
        }
        const idUsuarioOponente = idUsuarioLogado == salaUsuarioLogadoDb.idPlayer1 ? salaUsuarioLogadoDb.idPlayer2 : salaUsuarioLogadoDb.idPlayer1;
        if (idUsuarioOponente == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Oponente nao encontrado';
            throw ex;
        }
        
        // Buscar no mongodb
        const tirosFluxoDb = await this._tiroFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        const posicoesFluxoDb = await this._posicaoFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        const tirosFluxoDbInimigo = await this._tiroFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        const posicoesFluxoDbInimigo = await this._posicaoFluxoRepositorio.selectByNumeroRecuperacaoUrlSalaFluxoQueTenhaIdUsuarioOrDefault(salaUsuarioLogadoDb.numeroRecuperacaoUrl, idUsuarioOponente);
        
        let progressoJogadorOponente = new MdProgressoNaviosJogador();
        progressoJogadorOponente.naviosTotais = posicoesFluxoDb
            .filter(iPosicaoFluxo => this.eNavioAfundadoPorCompleto(iPosicaoFluxo, tirosFluxoDb)) // Revelar apenas os navios afundados completamente
            .map(iPosicaoFluxo => {
                return { tamanhoQuadradosNavio: iPosicaoFluxo.tamanhoQuadradosNavio, numeroLinha: iPosicaoFluxo.numeroLinha, numeroColuna: iPosicaoFluxo.numeroColuna, orientacao: iPosicaoFluxo.orientacao };
            });
        progressoJogadorOponente.tiros = tirosFluxoDb.map(iTiroFluxo => {
            return { numeroLinha: iTiroFluxo.numeroLinha, numeroColuna: iTiroFluxo.numeroColuna, acertou: this.eTiroAcertado(iTiroFluxo, posicoesFluxoDb) };
        });
        
        // Calcular de quem e a vez
        let idTiroDbMaisRecente = '';
        if ([...tirosFluxoDb, ...tirosFluxoDbInimigo].length == 0) {
            progressoJogadorOponente.estaNaVezDoJogador = salaUsuarioLogadoDb.idPlayer1 != idUsuarioLogado;
        } else {
            let idJogadorAlvoTiroMaisRecente = '';
            let horaMaisRecente = Number.MIN_SAFE_INTEGER;
            for (let iTiro of [...tirosFluxoDb, ...tirosFluxoDbInimigo]) {
                if (horaMaisRecente < iTiro.horaInclusao.getTime()) {
                    idJogadorAlvoTiroMaisRecente = iTiro.idUsuarioAlvo;
                    idTiroDbMaisRecente = iTiro.id;
                    horaMaisRecente = iTiro.horaInclusao.getTime();
                }
            }
            progressoJogadorOponente.estaNaVezDoJogador = idJogadorAlvoTiroMaisRecente != idUsuarioLogado;
        }
        
        // Verificar se foi um tiro certeiro - se sim, inveter o valor logico pois assim continua na vez de quem atirou
        if ([...tirosFluxoDb, ...tirosFluxoDbInimigo].length > 0) {
            if (progressoJogadorOponente.estaNaVezDoJogador) {
                
                // Ultimo tiro foi do inimigo, entao verificar entre os navios do jogador logado
                const ultimoTiroDbInimigo = [...tirosFluxoDb, ...tirosFluxoDbInimigo].find(x => x.id == idTiroDbMaisRecente);
                if (ultimoTiroDbInimigo != undefined && this.eTiroAcertado(ultimoTiroDbInimigo, posicoesFluxoDb))
                    progressoJogadorOponente.estaNaVezDoJogador = !progressoJogadorOponente.estaNaVezDoJogador;
            } else {
                
                // Ultimo tiro foi do jogador logado, entao verificar entre os navios do inimigo
                const ultimoTiroDbJogadorLogado = [...tirosFluxoDb, ...tirosFluxoDbInimigo].find(x => x.id == idTiroDbMaisRecente);
                if (ultimoTiroDbJogadorLogado != undefined && this.eTiroAcertado(ultimoTiroDbJogadorLogado, posicoesFluxoDbInimigo))
                    progressoJogadorOponente.estaNaVezDoJogador = !progressoJogadorOponente.estaNaVezDoJogador;
            }
        }
        
        return progressoJogadorOponente;
    }
    
    
    // autorizado
    // post
    adicionarTiro = async (tiroPostado: PostTiroFluxo, idUsuarioLogado: string): Promise<string> => {
        
        // Validaçoes
        const salaUsuarioLogadoDb = await this._salaFluxoRepositorio.selectByUsuarioJogandoOrDefault(idUsuarioLogado);
        if (salaUsuarioLogadoDb == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Voce ainda nao entrou em uma sala';
            throw ex;
        }
        const idUsuarioOponente = idUsuarioLogado == salaUsuarioLogadoDb.idPlayer1 ? salaUsuarioLogadoDb.idPlayer2 : salaUsuarioLogadoDb.idPlayer1;
        if (idUsuarioOponente == null) {
            let ex = new MdExcecao();
            ex.codigoExcecao = 404;
            ex.problema = 'Oponente nao encontrado';
            throw ex;
        }
        
        // Salvar no mongodb
        let novoTiro = new DbTiroFluxo();
        novoTiro.id = StringUteis.gerarNovoIdDe24Caracteres();
        novoTiro.numeroRecuperacaoUrlSalaFluxo = salaUsuarioLogadoDb.numeroRecuperacaoUrl;
        novoTiro.idUsuarioAlvo = idUsuarioOponente;
        novoTiro.numeroLinha = tiroPostado.numeroLinha;
        novoTiro.numeroColuna = tiroPostado.numeroColuna;
        await this._tiroFluxoRepositorio.insertPorOperador(novoTiro, idUsuarioLogado);
        return novoTiro.id;
    }
}

export { FluxoMultiplayerController };
