import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract, ContractStatus } from '../entities/contract.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContractsService {
  constructor(
    @InjectRepository(Contract)
    private contractRepository: Repository<Contract>,
    private mailService: MailService,
  ) {}

  async findAll(): Promise<Contract[]> {
    return this.contractRepository.find({
      relations: ['owner', 'client', 'booking'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOwner(ownerId: number): Promise<Contract[]> {
    return this.contractRepository.find({
      where: { ownerId },
      relations: ['owner', 'client', 'booking'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByClient(clientId: number): Promise<Contract[]> {
    return this.contractRepository.find({
      where: { clientId },
      relations: ['owner', 'client', 'booking'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Contract | null> {
    return this.contractRepository.findOne({
      where: { id },
      relations: ['owner', 'client', 'booking'],
    });
  }

  async create(contractData: Partial<Contract>): Promise<Contract> {
    // Generate contract number
    const count = await this.contractRepository.count();
    const contractNumber = `CON-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const contract = this.contractRepository.create({
      ...contractData,
      contractNumber,
      status: contractData.status || ContractStatus.DRAFT,
    });

    return this.contractRepository.save(contract);
  }

  async update(id: number, contractData: Partial<Contract>): Promise<Contract | null> {
    const contract = await this.findOne(id);
    
    if (!contract) {
      return null;
    }

    await this.contractRepository.update(id, contractData);
    return this.findOne(id);
  }

  async signContract(
    id: number,
    signatureData: { signatureData: string; signerName: string; ipAddress?: string },
  ): Promise<Contract | null> {
    const contract = await this.findOne(id);
    
    if (!contract) {
      return null;
    }

    await this.contractRepository.update(id, {
      signatureData: signatureData.signatureData,
      signerName: signatureData.signerName,
      signerIpAddress: signatureData.ipAddress,
      signedDate: new Date(),
      status: ContractStatus.SIGNED,
    });

    const updatedContract = await this.findOne(id);
    
    // Send email notification to owner
    if (updatedContract && updatedContract.client && updatedContract.owner) {
      await this.mailService.sendContractSignedNotification(
        updatedContract,
        updatedContract.client,
        updatedContract.owner,
      );
    }

    return updatedContract;
  }

  async sendContract(id: number): Promise<Contract | null> {
    const contract = await this.findOne(id);
    
    if (!contract) {
      return null;
    }

    await this.contractRepository.update(id, {
      sentDate: new Date(),
      status: ContractStatus.SENT,
    });

    const updatedContract = await this.findOne(id);
    
    // Send email notification to client
    if (updatedContract && updatedContract.client && updatedContract.owner) {
      await this.mailService.sendContractNotification(
        updatedContract,
        updatedContract.client,
        updatedContract.owner,
      );
    }

    return updatedContract;
  }

  async delete(id: number): Promise<void> {
    await this.contractRepository.delete(id);
  }
}
