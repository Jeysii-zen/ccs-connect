<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Known accounts for the Playwright browser tests (tests/e2e). Only ever
 * seeded into the separate ccs_connect_e2e database; password: "password".
 */
class E2eSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(LocationSeeder::class);

        User::factory()->create([
            'role' => 'admin',
            'first_name' => 'Ada',
            'last_name' => 'Admin',
            'email' => 'admin@e2e.test',
        ]);

        User::factory()->create([
            'role' => 'faculty',
            'first_name' => 'Fe',
            'last_name' => 'Faculty',
            'email' => 'faculty@e2e.test',
            'faculty_id' => 'FAC-E2E-001',
            'employment_type' => 'Full-time',
        ]);

        User::factory()->create([
            'role' => 'student',
            'first_name' => 'Stu',
            'last_name' => 'Student',
            'email' => 'student@e2e.test',
            'student_number' => '26-99-001',
            'year_level' => '3',
            'block_number' => '2',
        ]);
    }
}
